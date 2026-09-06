import type { InputHTMLAttributes, ReactNode } from "react";
import { ArrowLeft, Images, Plus } from "lucide-react";
import { AdminActionRouterLink } from "./AdminActionControl";

export function StudioBackLink({to = "/admin/gallery", label = "Back to Galleries"}: {to?: string; label?: string}) {
  return <AdminActionRouterLink to={to} aria-label={label} className="admin-button admin-button--secondary"><ArrowLeft /></AdminActionRouterLink>;
}

export function StudioAddGalleryLink() {
  return <AdminActionRouterLink to="/admin/custom-collections?new=gallery" aria-label="Add gallery" data-admin-action="create" className="admin-button admin-button--primary"><Plus /></AdminActionRouterLink>;
}

export function StudioThumbnail({src, alt = ""}: {src?: string; alt?: string}) {
  return <span className="studio-thumbnail">{src ? <img src={src} alt={alt} /> : <Images aria-hidden="true" />}</span>;
}

export function StudioToggle({children, ...props}: InputHTMLAttributes<HTMLInputElement> & {children: ReactNode}) {
  return <label className="studio-toggle"><input {...props} type="checkbox" /><span>{children}</span></label>;
}
