import fs from "fs";
import path from "path";

const BLOG_THUMB_DIR = "blog/thumb";
const OUTPUT = "public/blog-gallery.csv";

function walk(dir, fileList = []) {
  const files = fs.readdirSync(dir);

  files.forEach((file) => {
    const fullPath = path.join(dir, file);

    if (fs.statSync(fullPath).isDirectory()) {
      walk(fullPath, fileList);
    } else {
      fileList.push(fullPath);
    }
  });

  return fileList;
}

const root = BLOG_THUMB_DIR;

if (!fs.existsSync(root)) {
  console.log(`Folder not found: ${root}`);
  process.exit(1);
}

const files = walk(root)
  .filter((f) => /\.(jpg|jpeg|png|webp)$/i.test(f))
  .sort();

const rows = [
  "blogSlug,filename,blogOrder,blogCover,alt"
];

files.forEach((file, index) => {
  const slug = path.basename(path.dirname(file));
  const filename = path.basename(file);

  rows.push(
    `${slug},${filename},${index + 1},FALSE,`
  );
});

fs.writeFileSync(OUTPUT, rows.join("\n"));

console.log(`Created ${OUTPUT} with ${files.length} images`);