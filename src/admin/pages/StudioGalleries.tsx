import { Link } from "react-router-dom";
import { ArrowRight, Building2, Images, Layers3, MapPinned, Settings2 } from "lucide-react";
import { AdminPage, AdminPageHeader } from "../components/ui/AdminUI";
import { StudioAddGalleryLink } from "../components/ui/StudioUI";

export const studioGalleryDestinations = [
  {label: "Venues", to: "/admin/venues", icon: Building2},
  {label: "Moments", to: "/admin/moments", icon: Images},
  {label: "Locations", to: "/admin/locations", icon: MapPinned},
  {label: "Collections", to: "/admin/custom-collections", icon: Layers3},
];

export function StudioGalleries() {
  return <AdminPage className="studio-page">
    <AdminPageHeader title="Galleries" actions={<StudioAddGalleryLink />} />
    <Link to="/admin/gallery/settings" className="studio-organiser-link" aria-label="Gallery organiser and settings">
      <span className="studio-destination__icon"><Settings2 aria-hidden="true" /></span>
      <strong>Gallery organiser &amp; settings</strong><ArrowRight className="studio-destination__arrow" aria-hidden="true" />
    </Link>
    <div className="studio-destination-grid">{studioGalleryDestinations.map(({label, to, icon: Icon}) =>
      <Link key={to} to={to} className="studio-destination" aria-label={`Open ${label.toLowerCase()}`}>
        <span className="studio-destination__icon"><Icon aria-hidden="true" /></span>
        <strong>{label}</strong><ArrowRight className="studio-destination__arrow" aria-hidden="true" />
      </Link>
    )}</div>
  </AdminPage>;
}
