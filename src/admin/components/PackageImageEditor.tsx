import { useEffect, useRef, useState } from "react";
import { ImagePlus, Upload, X } from "lucide-react";
import { AdminButton, AdminField } from "./ui/AdminUI";
import { AdminApiService } from "../services/AdminApiService";
import { PackageImage } from "../../components/PackageImage";
import { packagePresentation } from "../../../shared/package-presentation";
import type { CrmPackage } from "../types/crm";

export function PackageImageEditor({ value, disabled, onChange, onBusyChange }: { value: Partial<CrmPackage>; disabled: boolean; onChange: (patch: Partial<CrmPackage>) => void; onBusyChange: (busy: boolean) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const active = useRef(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => { active.current = true; return () => { active.current = false; onBusyChange(false); }; }, [onBusyChange]);
  const presentation = packagePresentation(value.imagePresentation);
  const patch = (next: Partial<typeof presentation>) => onChange({ imagePresentation: { ...presentation, ...next } });
  async function upload(file?: File) {
    if (!file || disabled || busy) return;
    setBusy(true); onBusyChange(true); setError("");
    try { const asset = await AdminApiService.uploadPackageImage(file); if (active.current) onChange({ imageUrl: asset.url }); }
    catch (reason) { if (active.current) setError(reason instanceof Error ? reason.message : "Unable to upload image."); }
    finally { if (active.current) { setBusy(false); onBusyChange(false); } if (input.current) input.current.value = ""; }
  }
  return <section className="crm-package-image-editor" aria-label="Package image">
    <div className="crm-package-image-controls">
      <strong>Package image</strong>
      <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" aria-label="Upload package image" hidden disabled={disabled || busy} onChange={event => void upload(event.target.files?.[0])} />
      <div className="flex flex-wrap gap-2"><AdminButton type="button" icon={Upload} disabled={disabled || busy} onClick={() => input.current?.click()}>{busy ? "Uploading…" : value.imageUrl ? "Change image" : "Add image"}</AdminButton>{value.imageUrl ? <AdminButton type="button" icon={X} disabled={disabled || busy} onClick={() => onChange({ imageUrl: "" })}>Remove image</AdminButton> : null}</div>
      <small className="admin-field__help">JPG, PNG or WebP · up to 2 MB</small>
      {error ? <p className="admin-alert admin-alert--error" role="alert">{error}</p> : null}
      {busy ? <p role="status">Preparing and uploading your image…</p> : null}
      <AdminField label="Image placement"><select className="admin-select" value={presentation.placement} disabled={disabled || busy} onChange={e => patch({ placement: e.target.value as "above" | "below" })}><option value="above">Above description</option><option value="below">Below description</option></select></AdminField>
      <AdminField label="Image fit"><select className="admin-select" value={presentation.fit} disabled={disabled || busy} onChange={e => patch({ fit: e.target.value as "cover" | "contain" })}><option value="cover">Fill frame</option><option value="contain">Show whole image</option></select></AdminField>
      {presentation.fit === "cover" && value.imageUrl ? <div className="crm-package-image-position"><AdminField label="Horizontal position"><input type="range" min="0" max="100" value={presentation.positionX} disabled={disabled || busy} onChange={e => patch({ positionX: Number(e.target.value) })} /></AdminField><AdminField label="Vertical position"><input type="range" min="0" max="100" value={presentation.positionY} disabled={disabled || busy} onChange={e => patch({ positionY: Number(e.target.value) })} /></AdminField><AdminButton type="button" size="sm" disabled={disabled || busy} onClick={() => patch({ positionX: 50, positionY: 50 })}>Centre image</AdminButton></div> : null}
      <details><summary>Use an existing image link</summary><AdminField label="Image URL"><input className="admin-input" type="url" value={value.imageUrl || ""} disabled={disabled || busy} onChange={e => onChange({ imageUrl: e.target.value })} /></AdminField></details>
    </div>
    <div className="crm-package-image-preview" aria-label="Package preview"><span>Preview</span><h3>{value.name || "Package name"}</h3>
      {!value.imageUrl ? <div className="crm-package-image-placeholder"><ImagePlus aria-hidden="true" /><span>Add an image to preview it here</span></div> : presentation.placement === "above" ? <PackageImage url={value.imageUrl} presentation={presentation} /> : null}
      <p className="crm-package-preview-description">{value.description || "Your package description"}</p>
      {value.imageUrl && presentation.placement === "below" ? <PackageImage url={value.imageUrl} presentation={presentation} /> : null}
      {value.includedItems?.length ? <ul>{value.includedItems.map((item,i) => <li key={i}>{item}</li>)}</ul> : null}
    </div>
  </section>;
}
