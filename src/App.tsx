import { BrowserRouter as Router, Routes, Route, Outlet, useLocation } from "react-router-dom";
import { useEffect } from "react";

import { Home } from "./components/Home";
import { Galleries } from "./components/Galleries";
import { Categories } from "./components/Categories";
import { Blog } from "./components/Blog";
import { WeddingStoryPage } from "./components/WeddingStoryPage";
import { Contact } from "./components/Contact";
import { Navigation } from "./components/Navigation";
import { Footer } from "./components/Footer";
import { ScrollToTop } from "./components/ScrollToTop";

import { GalleryLanding } from "./components/GalleryLanding";
import { GalleryByVenue } from "./components/GalleryByVenue";
import { GalleryVenueDetail } from "./components/GalleryVenueDetail";
import { GalleryByMoments } from "./components/GalleryByMoments";
import { GalleryMomentDetail } from "./components/GalleryMomentDetail";
import { GalleryByStyle } from "./components/GalleryByStyle";
import { GalleryFeaturedStories } from "./components/GalleryFeaturedStories";
import { GalleryStoryDetail } from "./components/GalleryStoryDetail";
import { GalleryCreativeFlash } from "./components/GalleryCreativeFlash";
import { GalleryCustomCollection } from "./components/GalleryCustomCollection";


import WeddingPackages from "./components/WeddingPackages";
import { ThankYou } from "./components/ThankYou";
import { CountyPage } from "./components/CountyPage";
import { CountiesLanding } from "./components/CountiesLanding";
import { ClientGallery } from "./components/ClientGallery";
import { Enquire } from "./components/LeadEnquiryForm";

/* ---------------- Google Analytics Listener ---------------- */
function GoogleAnalyticsListener() {
  const location = useLocation();

  useEffect(() => {
    // Private client-gallery capability tokens must never be sent to analytics.
    if (location.pathname.startsWith("/client-gallery/")) return;
    if (window.gtag) {
      window.gtag("config", "G-RQB9V9DTZP", {
        page_path: location.pathname,
      });
    }
  }, [location]);

  return null;
}

/* ---------- Layout with Navigation + Footer ---------- */
function SiteLayout() {
  return (
    <>
      <Navigation />
      <main className="pt-24">
        <Outlet />
      </main>
      <Footer />
      <ScrollToTop />
    </>
  );
}

export default function App() {
  return (
    <Router>
      <GoogleAnalyticsListener />

      <div className="min-h-screen bg-white">
        <Routes>
          <Route path="/client-gallery/:slug/:token" element={<ClientGallery />} />
          <Route path="/client-gallery/:token" element={<ClientGallery />} />

          {/* -------- Public site routes -------- */}
          <Route element={<SiteLayout />}>
            <Route path="/" element={<Home />} />

            <Route path="/galleries" element={<Galleries />} />

            <Route path="/categories" element={<Categories />} />
            <Route path="/categories/:category" element={<Categories />} />

            {/* Blog */}
            <Route path="/blog" element={<Blog />} />
            <Route path="/blog/:slug" element={<WeddingStoryPage />} />

            <Route path="/contact" element={<Contact />} />
            <Route path="/enquire" element={<Enquire />} />
            <Route path="/packages" element={<WeddingPackages />} />
            <Route path="/thank-you" element={<ThankYou />} />

            {/* County SEO pages */}
            <Route path="/wedding-photographer" element={<CountiesLanding />} />
            <Route path="/wedding-photographer/:countySlug" element={<CountyPage />} />
            <Route path="/gallery/locations" element={<CountiesLanding />} />
            <Route path="/gallery/locations/:locationSlug" element={<CountyPage />} />

            {/* Gallery system */}
            <Route path="/gallery" element={<GalleryLanding />} />
            <Route path="/gallery/venues" element={<GalleryByVenue />} />
            <Route path="/gallery/venue/:venueId" element={<GalleryVenueDetail />} />
            <Route path="/gallery/moments" element={<GalleryByMoments />} />
            <Route path="/gallery/moment/:momentId" element={<GalleryMomentDetail />} />
            <Route path="/gallery/styles" element={<GalleryByStyle />} />
            <Route path="/gallery/style/:styleId" element={<GalleryVenueDetail />} />
            <Route path="/gallery/stories" element={<GalleryFeaturedStories />} />
            <Route path="/gallery/story/:storyId" element={<GalleryStoryDetail />} />
            <Route path="/gallery/best-of/:categoryId" element={<GalleryVenueDetail />} />
            <Route path="/gallery/creative-flash" element={<GalleryCreativeFlash />} />
            <Route path="/gallery/collection/:collectionSlug" element={<GalleryCustomCollection />} />
          </Route>
        </Routes>
      </div>
    </Router>
  );
}