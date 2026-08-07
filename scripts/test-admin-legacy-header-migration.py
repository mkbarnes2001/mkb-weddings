#!/usr/bin/env python3

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PAGES = ROOT / "src/admin/pages"

MIGRATED = {
    "WeddingCollections.tsx": "Collections",
    "WeddingContentEditor.tsx": "Master content",
    "WeddingImages.tsx": "Images",
    "WeddingSuppliers.tsx": "Suppliers",
    "WeddingWorkspace.tsx": "Wedding Workspace",
    "WeddingStory.tsx": "Story",
    "WeddingSupplierEditor.tsx": "Supplier editor",
    "WeddingDetail.tsx": "Wedding details",
    "WeddingPublish.tsx": "Publishing",
    "ClientGalleryEditor.tsx": "Client gallery",
    "ClientGalleryReview.tsx": "Gallery review",
    "CreativeFlashGallery.tsx": "Creative Flash",
    "CustomCollectionGallery.tsx": "Collection gallery",
    "CustomCollections.tsx": "Custom collections",
    "LocationGallerySettings.tsx": "Location Gallery",
    "MomentGallery.tsx": "Moment gallery",
    "Moments.tsx": "Moments",
    "NewVenue.tsx": "New venue",
    "VenueContentEditor.tsx": "Venue content",
    "VenueDetail.tsx": "Venue details",
    "VenueGallery.tsx": "Venue gallery",
    "VenueGalleryMigration.tsx": "Gallery migration",
    "VenueMigration.tsx": "Venue migration",
    "VenueUpload.tsx": "Image upload",
}


def read(name: str) -> str:
    return (PAGES / name).read_text(encoding="utf-8")


def main() -> None:
    for filename, title in MIGRATED.items():
        text = read(filename)

        assert "AdminPageHeader" in text, filename
        assert f'title="{title}"' in text, filename

    images = read("WeddingImages.tsx")
    assert "Save all changes" in images

    suppliers = read("WeddingSuppliers.tsx")
    assert "Edit suppliers" in suppliers

    workspace = read("WeddingWorkspace.tsx")
    assert "Open CRM Job" in workspace
    assert "Master content" in workspace
    assert "Publishing" in workspace

    story = read("WeddingStory.tsx")
    assert "Edit master content" in story

    supplier_editor = read(
        "WeddingSupplierEditor.tsx"
    )
    assert "Admin API connected" in supplier_editor

    detail = read("WeddingDetail.tsx")
    assert "Wedding Workspace" in detail
    assert "Open images" in detail
    assert "Open story" in detail

    publishing = read("WeddingPublish.tsx")
    assert "Story is live" in publishing
    assert "Story is in draft" in publishing
    assert "Open public story" in publishing

    wizard = read("NewWeddingWizard.tsx")
    assert wizard.count("AdminPageHeader") >= 2
    assert 'title="Wedding created"' in wizard
    assert 'title="New wedding"' in wizard
    assert "Open Wedding Workspace" in wizard
    assert "Create another" in wizard
    assert "Step {step + 1} of {steps.length}" in wizard

    gallery_editor = read("ClientGalleryEditor.tsx")
    assert "Back to galleries" in gallery_editor
    assert "Workspace" in gallery_editor
    assert "Preview" in gallery_editor
    assert "Share private gallery" in gallery_editor

    gallery_review = read("ClientGalleryReview.tsx")
    assert "Back to Client Gallery" in gallery_review
    assert "Copy filenames" in gallery_review
    assert "Download all originals" in gallery_review

    creative_flash = read("CreativeFlashGallery.tsx")
    assert "View live gallery" in creative_flash
    assert "Save gallery" in creative_flash

    custom_gallery = read("CustomCollectionGallery.tsx")
    assert "Back to custom collections" in custom_gallery
    assert "View live gallery" in custom_gallery

    custom_collections = read("CustomCollections.tsx")
    assert "Back to Gallery Management" in custom_collections

    location_gallery = read("LocationGallerySettings.tsx")
    assert "View live" in location_gallery
    assert "Save gallery" in location_gallery

    moment_gallery = read("MomentGallery.tsx")
    assert "Back to moments" in moment_gallery
    assert "View live gallery" in moment_gallery

    moments = read("Moments.tsx")
    assert "Add moment" in moments
    assert "Save moments" in moments

    new_venue = read("NewVenue.tsx")
    assert "Create venue" in new_venue
    assert "Back to venues" in new_venue

    venue_content = read("VenueContentEditor.tsx")
    assert "Save venue" in venue_content
    assert "Back to venue" in venue_content

    venue_detail = read("VenueDetail.tsx")
    assert "Website" in venue_detail
    assert "Instagram" in venue_detail
    assert "Map" in venue_detail

    venue_gallery = read("VenueGallery.tsx")
    assert "Upload images" in venue_gallery
    assert "Manage moments" in venue_gallery
    assert "Publish venue" in venue_gallery
    assert "Save gallery" in venue_gallery

    gallery_migration = read("VenueGalleryMigration.tsx")
    assert "Back to venues" in gallery_migration
    assert "ready" in gallery_migration

    venue_migration = read("VenueMigration.tsx")
    assert "Back to venues" in venue_migration
    assert "runMigration" in venue_migration

    venue_upload = read("VenueUpload.tsx")
    assert "Back to venue gallery" in venue_upload
    assert "queuedCount" in venue_upload

    print("PASS legacy Admin header migration — all live legacy pages")
    print("  migrated live legacy pages: 25")
    print("  back navigation retained: verified")
    print("  record summaries retained: verified")
    print("  operational actions retained: verified")
    print("  new-wedding success state: verified")


if __name__ == "__main__":
    main()
