import { Navigate, Routes, Route, useParams } from "react-router-dom";
import { AdminLayout } from "../layouts/AdminLayout";
import { Dashboard } from "../pages/Dashboard";
import { Weddings } from "../pages/Weddings";
import { NewWeddingWizard } from "../pages/NewWeddingWizard";
import { WeddingDetail } from "../pages/WeddingDetail";
import { WeddingContentEditor } from "../pages/WeddingContentEditor";
import { WeddingWorkspace } from "../pages/WeddingWorkspace";
import { WeddingImages } from "../pages/WeddingImages";
import { WeddingSuppliers } from "../pages/WeddingSuppliers";
import { WeddingSupplierEditor } from "../pages/WeddingSupplierEditor";
import { WeddingStory } from "../pages/WeddingStory";
import { WeddingPublish } from "../pages/WeddingPublish";
import { WeddingCollections } from "../pages/WeddingCollections";
import { Suppliers } from "../pages/Suppliers";
import { AICentre } from "../pages/AICentre";
import { Collections } from "../pages/Collections";
import { SEOCentre } from "../pages/SEOCentre";
import { PlaceholderPage } from "../pages/PlaceholderPage";
import { Settings } from "../pages/Settings";
import { AssetLibrary } from "../pages/AssetLibrary";
import { ClientGalleries } from "../pages/ClientGalleries";
import { ClientGalleryEditor } from "../pages/ClientGalleryEditor";
import { ClientGalleryReview } from "../pages/ClientGalleryReview";
import { Locations } from "../pages/Locations";
import { LocationGallerySettingsPage } from "../pages/LocationGallerySettings";
import { Venues } from "../pages/Venues";
import { NewVenue } from "../pages/NewVenue";
import { VenueDetail } from "../pages/VenueDetail";
import { VenueContentEditor } from "../pages/VenueContentEditor";
import { VenueMigration } from "../pages/VenueMigration";
import { VenueGallery } from "../pages/VenueGallery";
import { Moments } from "../pages/Moments";
import { MomentGallery } from "../pages/MomentGallery";
import { CreativeFlashGallery } from "../pages/CreativeFlashGallery";
import { CustomCollections } from "../pages/CustomCollections";
import { CustomCollectionGallery } from "../pages/CustomCollectionGallery";
import { VenueUpload } from "../pages/VenueUpload";
import { VenueGalleryMigration } from "../pages/VenueGalleryMigration";

export function AdminApp() {
  return (
    <Routes>
      <Route element={<AdminLayout />}>
        <Route index element={<Dashboard />} />
        <Route path="weddings" element={<Weddings />} />
        <Route path="weddings/new" element={<NewWeddingWizard />} />
        <Route path="weddings/:slug" element={<WeddingDetail />} />
        <Route path="weddings/:slug/workspace" element={<WeddingWorkspace />} />
        <Route
          path="weddings/:slug/content"
          element={<WeddingContentEditor />}
        />
        <Route path="weddings/:slug/images" element={<WeddingImages />} />
        <Route path="weddings/:slug/story" element={<WeddingStory />} />
        <Route
          path="weddings/:slug/story/edit"
          element={<LegacyWeddingStoryEditorRedirect />}
        />
        <Route
          path="weddings/:slug/suppliers"
          element={<WeddingSuppliers />}
        />
        <Route
          path="weddings/:slug/suppliers/edit"
          element={<WeddingSupplierEditor />}
        />
        <Route path="weddings/:slug/publish" element={<WeddingPublish />} />
        <Route
          path="weddings/:slug/collections"
          element={<WeddingCollections />}
        />
        <Route path="gallery" element={<Collections />} />
        <Route path="gallery/locations" element={<LocationGallerySettingsPage />} />
        <Route path="locations" element={<Locations />} />
        <Route path="moments" element={<Moments />} />
        <Route path="moments/:slug/gallery" element={<MomentGallery />} />
        <Route path="creative-flash" element={<CreativeFlashGallery />} />
        <Route path="custom-collections" element={<CustomCollections />} />
        <Route path="custom-collections/:slug/gallery" element={<CustomCollectionGallery />} />
        <Route path="collections" element={<Collections />} />
        <Route path="venues" element={<Venues />} />
        <Route path="venues/new" element={<NewVenue />} />
        <Route path="venues/migrate" element={<VenueMigration />} />
        <Route
          path="venues/migrate-gallery"
          element={<VenueGalleryMigration />}
        />
        <Route path="venues/:slug" element={<VenueDetail />} />
        <Route path="venues/:slug/content" element={<VenueContentEditor />} />
        <Route path="venues/:slug/gallery" element={<VenueGallery />} />
        <Route path="venues/:slug/upload" element={<VenueUpload />} />
        <Route path="suppliers" element={<Suppliers />} />
        <Route path="assets" element={<AssetLibrary />} />
        <Route path="client-galleries" element={<ClientGalleries />} />
        <Route path="client-galleries/:id" element={<ClientGalleryEditor />} />
        <Route path="client-galleries/:id/review" element={<ClientGalleryReview />} />
        <Route path="ai" element={<AICentre />} />
        <Route path="seo" element={<SEOCentre />} />
        <Route
          path="publishing"
          element={
            <PlaceholderPage
              title="Publishing"
              description="Build, validate and deploy weddings from one checklist."
            />
          }
        />
        <Route path="settings" element={<Settings />} />
      </Route>
    </Routes>
  );
}


function LegacyWeddingStoryEditorRedirect() {
  const { slug } = useParams();
  return <Navigate to={`/admin/weddings/${slug || ""}/content`} replace />;
}
