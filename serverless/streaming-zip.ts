export type StreamingZipEntry = {
  filename: string;
  storageKey: string;
};

type R2StoredObjectLike = {
  body: ReadableStream<Uint8Array> | null;
  size?: number;
};

type R2BucketLike = {
  get(key: string): Promise<R2StoredObjectLike | null>;
};

const encoder = new TextEncoder();
const MAX_UINT32 = 0xffffffff;

function writeUint16(view: DataView, offset: number, value: number) {
  view.setUint16(offset, value & 0xffff, true);
}

function writeUint32(view: DataView, offset: number, value: number) {
  view.setUint32(offset, value >>> 0, true);
}

function dosDateTime(date = new Date()) {
  const year = Math.max(1980, Math.min(2107, date.getFullYear()));
  const time = ((date.getHours() & 0x1f) << 11)
    | ((date.getMinutes() & 0x3f) << 5)
    | (Math.floor(date.getSeconds() / 2) & 0x1f);
  const day = date.getDate() & 0x1f;
  const month = (date.getMonth() + 1) & 0x0f;
  const packedDate = (((year - 1980) & 0x7f) << 9) | (month << 5) | day;
  return { time, date: packedDate };
}

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32Update(crc: number, bytes: Uint8Array) {
  let value = crc >>> 0;
  for (let i = 0; i < bytes.length; i += 1) {
    value = CRC_TABLE[(value ^ bytes[i]) & 0xff] ^ (value >>> 8);
  }
  return value >>> 0;
}

function cleanFilename(value: string) {
  const normalized = String(value || 'photograph.jpg')
    .replace(/[\\/]+/g, '-')
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .trim();
  return normalized || 'photograph.jpg';
}

function uniqueFilename(value: string, used: Map<string, number>) {
  const clean = cleanFilename(value);
  const lower = clean.toLowerCase();
  const count = used.get(lower) || 0;
  used.set(lower, count + 1);
  if (count === 0) return clean;
  const dot = clean.lastIndexOf('.');
  const base = dot > 0 ? clean.slice(0, dot) : clean;
  const ext = dot > 0 ? clean.slice(dot) : '';
  return `${base} (${count + 1})${ext}`;
}

function localHeader(name: Uint8Array, time: number, date: number) {
  const buffer = new ArrayBuffer(30 + name.length);
  const view = new DataView(buffer);
  writeUint32(view, 0, 0x04034b50);
  writeUint16(view, 4, 20);
  writeUint16(view, 6, 0x0808); // UTF-8 + data descriptor
  writeUint16(view, 8, 0); // stored, no compression
  writeUint16(view, 10, time);
  writeUint16(view, 12, date);
  writeUint32(view, 14, 0);
  writeUint32(view, 18, 0);
  writeUint32(view, 22, 0);
  writeUint16(view, 26, name.length);
  writeUint16(view, 28, 0);
  new Uint8Array(buffer, 30).set(name);
  return new Uint8Array(buffer);
}

function dataDescriptor(crc: number, size: number) {
  const buffer = new ArrayBuffer(16);
  const view = new DataView(buffer);
  writeUint32(view, 0, 0x08074b50);
  writeUint32(view, 4, crc);
  writeUint32(view, 8, size);
  writeUint32(view, 12, size);
  return new Uint8Array(buffer);
}

function centralHeader(input: {
  name: Uint8Array;
  time: number;
  date: number;
  crc: number;
  size: number;
  localOffset: number;
}) {
  const { name, time, date, crc, size, localOffset } = input;
  const buffer = new ArrayBuffer(46 + name.length);
  const view = new DataView(buffer);
  writeUint32(view, 0, 0x02014b50);
  writeUint16(view, 4, 20);
  writeUint16(view, 6, 20);
  writeUint16(view, 8, 0x0808);
  writeUint16(view, 10, 0);
  writeUint16(view, 12, time);
  writeUint16(view, 14, date);
  writeUint32(view, 16, crc);
  writeUint32(view, 20, size);
  writeUint32(view, 24, size);
  writeUint16(view, 28, name.length);
  writeUint16(view, 30, 0);
  writeUint16(view, 32, 0);
  writeUint16(view, 34, 0);
  writeUint16(view, 36, 0);
  writeUint32(view, 38, 0);
  writeUint32(view, 42, localOffset);
  new Uint8Array(buffer, 46).set(name);
  return new Uint8Array(buffer);
}

function endOfCentralDirectory(entries: number, centralSize: number, centralOffset: number) {
  const buffer = new ArrayBuffer(22);
  const view = new DataView(buffer);
  writeUint32(view, 0, 0x06054b50);
  writeUint16(view, 4, 0);
  writeUint16(view, 6, 0);
  writeUint16(view, 8, entries);
  writeUint16(view, 10, entries);
  writeUint32(view, 12, centralSize);
  writeUint32(view, 16, centralOffset);
  writeUint16(view, 20, 0);
  return new Uint8Array(buffer);
}

export function createStoredZipStream(bucket: R2BucketLike, entries: StreamingZipEntry[]) {
  if (entries.length > 65535) throw new Error('Too many files for one ZIP download.');
  const usedNames = new Map<string, number>();

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      let offset = 0;
      const central: Uint8Array[] = [];
      try {
        for (const entry of entries) {
          const object = await bucket.get(entry.storageKey);
          if (!object?.body) throw new Error(`Original file is unavailable: ${entry.filename}`);
          const filename = uniqueFilename(entry.filename, usedNames);
          const name = encoder.encode(filename);
          if (name.length > 65535) throw new Error(`Filename is too long: ${filename}`);
          const { time, date } = dosDateTime();
          const localOffset = offset;
          const header = localHeader(name, time, date);
          controller.enqueue(header);
          offset += header.length;

          let crc = 0xffffffff;
          let size = 0;
          const reader = object.body.getReader();
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            if (!value?.length) continue;
            size += value.length;
            offset += value.length;
            if (size > MAX_UINT32 || offset > MAX_UINT32) {
              throw new Error('This download is too large for a single ZIP. Download the originals in smaller groups.');
            }
            crc = crc32Update(crc, value);
            controller.enqueue(value);
          }
          crc = (crc ^ 0xffffffff) >>> 0;
          const descriptor = dataDescriptor(crc, size);
          controller.enqueue(descriptor);
          offset += descriptor.length;
          central.push(centralHeader({ name, time, date, crc, size, localOffset }));
        }

        const centralOffset = offset;
        let centralSize = 0;
        for (const record of central) {
          controller.enqueue(record);
          offset += record.length;
          centralSize += record.length;
        }
        if (offset > MAX_UINT32 || centralOffset > MAX_UINT32 || centralSize > MAX_UINT32) {
          throw new Error('This download is too large for a single ZIP. Download the originals in smaller groups.');
        }
        controller.enqueue(endOfCentralDirectory(central.length, centralSize, centralOffset));
        controller.close();
      } catch (error) {
        controller.error(error);
      }
    },
  });
}
