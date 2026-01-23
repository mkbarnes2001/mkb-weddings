import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

import { Home } from './components/Home';
import { Galleries } from './components/Galleries';
import { Categories } from './components/Categories';
import { Blog } from './components/Blog';
import { BlogAdmin } from './components/BlogAdmin';
import { GalleryAdmin } from './components/GalleryAdmin';
import { Contact } from './components/Contact';
import { Navigation } from './components/Navigation';
import { Footer } from './components/Footer';
import { ScrollToTop } from './components/ScrollToTop';

import { GalleryLanding } from './components/GalleryLanding';
import { GalleryByVenue } from './components/GalleryByVenue';
import { GalleryVenueDetail } from './components/GalleryVenueDetail';
import { GalleryByMoments } from './components/GalleryByMoments';
import { GalleryMomentDetail } from './components/GalleryMomentDetail';
import { GalleryByStyle } from './components/GalleryByStyle';
import { GalleryFeaturedStories } from './components/GalleryFeaturedStories';
import { GalleryStoryDetail } from './components/GalleryStoryDetail';
import { GalleryCreativeFlash } from './components/GalleryCreativeFlash';

import { WeddingPackages } from './components/WeddingPackages';
import { ThankYou } from './components/ThankYou';

import { Outlet } from 'react-router-dom';

import { useLocation } from 'react-router-dom';
import { useEffect } from 'react';

function GoogleAnalyticsListener() {
  const location = useLocation();

  useEffect(() => {
    if (window.gtag) {
      window.gtag('config', 'G-XY6TDDLH1Q', {
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
      <Outlet />
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

          {/* -------- Admin routes (no nav / footer) -------- */}
          <Route path="/admin" element={<BlogAdmin />} />
          <Route path="/gallery-admin" element={<GalleryAdmin />} />

          {/* -------- Public site routes -------- */}
          <Route element={<SiteLayout />}>
            <Route path="/" element={<Home />} />
            <Route path="/galleries" element={<Galleries />} />
            <Route path="/categories" element={<Categories />} />
            <Route path="/categories/:category" element={<Categories />} />
            <Route path="/blog" element={<Blog />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/packages" element={<WeddingPackages />} />
            <Route path="/thank-you" element={<ThankYou />} />

            {/* -------- Gallery system -------- */}
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
          </Route>

        </Routes>
      </div>
    </Router>
  );
}
