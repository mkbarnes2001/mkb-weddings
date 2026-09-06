import { useEffect, useState } from "react";
import { packagePresentation, type PackagePresentation } from "../../shared/package-presentation";

export function PackageImage({ url, presentation, alt = "" }: { url?: string; presentation?: Partial<PackagePresentation>; alt?: string }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [url]);
  if (!url) return null;
  const image = packagePresentation(presentation);
  return failed ? <span className="package-image-unavailable">Image unavailable</span> : <img className="package-image" src={url} alt={alt} onError={() => setFailed(true)} style={{ display: "block", width: "100%", height: "auto", aspectRatio: "4 / 3", objectFit: image.fit, objectPosition: `${image.positionX}% ${image.positionY}%`, borderRadius: 8, background: "#f1f1f1" }} />;
}
