import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Home } from './components/Home';
import { Galleries } from './components/Galleries';
import { Categories } from './components/Categories';
import { VenuePage } from './components/VenuePage';
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

export default function App() {
  return (
    <Router>
      <div className="min-h-screen bg-white">
        <Routes>
          {/* Admin Routes - No Navigation/Footer */}
          <Route path="/admin" element={<BlogAdmin />} />
          <Route path="/gallery-admin" element={<GalleryAdmin />} />

          {/* Main Routes - With Navigation/Footer */}
          <Route
            path="/*"
            element={
              <>
                <Navigation />
                <Routes>
                  <Route path="/" element={<Home />} />
                  <Route path="/galleries" element={<Galleries />} />
                  <Route path="/categories" element={<Categories />} />
                  <Route path="/categories/:category" element={<Categories />} />
                  <Route path="/blog" element={<Blog />} />
                  <Route path="/contact" element={<Contact />} />
                  <Route path="/packages" element={<WeddingPackages />} />
                  <Route path="/thank-you" element={<ThankYou />} />
                  
                  {/* New Gallery System Routes */}
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
                </Routes>
                <Footer />
                <ScrollToTop />
              </>
            }
          />
        </Routes>
      </div>
    </Router>
  );
}