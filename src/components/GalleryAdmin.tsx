import { useState, useEffect } from 'react';
import { Plus, Trash2, Save, Lock, LogOut, Upload, X, MapPin, Camera, Eye } from 'lucide-react';
import { loadVenues, saveVenues, type Venue, type GalleryImage, moments, photographyStyles } from './GalleryData';

export function GalleryAdmin() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [venues, setVenues] = useState<Venue[]>([]);
  const [selectedVenue, setSelectedVenue] = useState<string>('');
  const [showImageForm, setShowImageForm] = useState(false);
  const [showVenueForm, setShowVenueForm] = useState(false);
  const [activeTab, setActiveTab] = useState<'venues' | 'images'>('venues');
  
  // Image form fields
  const [imageSrc, setImageSrc] = useState('');
  const [imageAlt, setImageAlt] = useState('');
  const [selectedMoments, setSelectedMoments] = useState<string[]>([]);
  const [selectedStyles, setSelectedStyles] = useState<string[]>([]);
  const [editingImage, setEditingImage] = useState<GalleryImage | null>(null);

  // Venue form fields
  const [venueName, setVenueName] = useState('');
  const [venueLocation, setVenueLocation] = useState('');
  const [venueDescription, setVenueDescription] = useState('');
  const [venueKeywords, setVenueKeywords] = useState('');
  const [editingVenue, setEditingVenue] = useState<Venue | null>(null);

  const ADMIN_PASSWORD = 'mkbweddings2025';

  useEffect(() => {
    const loadedVenues = loadVenues();
    setVenues(loadedVenues);
    if (loadedVenues.length > 0) {
      setSelectedVenue(loadedVenues[0].id);
    }
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === ADMIN_PASSWORD) {
      setIsAuthenticated(true);
      setPassword('');
    } else {
      alert('Incorrect password');
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
  };

  const resetImageForm = () => {
    setImageSrc('');
    setImageAlt('');
    setSelectedMoments([]);
    setSelectedStyles([]);
    setEditingImage(null);
    setShowImageForm(false);
  };

  const resetVenueForm = () => {
    setVenueName('');
    setVenueLocation('');
    setVenueDescription('');
    setVenueKeywords('');
    setEditingVenue(null);
    setShowVenueForm(false);
  };

  const toggleMoment = (momentId: string) => {
    setSelectedMoments(prev =>
      prev.includes(momentId)
        ? prev.filter(m => m !== momentId)
        : [...prev, momentId]
    );
  };

  const toggleStyle = (styleId: string) => {
    setSelectedStyles(prev =>
      prev.includes(styleId)
        ? prev.filter(s => s !== styleId)
        : [...prev, styleId]
    );
  };

  const handleSaveImage = () => {
    if (!imageSrc || !imageAlt || !selectedVenue) {
      alert('Please fill in all required fields and select a venue');
      return;
    }

    if (selectedMoments.length === 0) {
      alert('Please select at least one moment category');
      return;
    }

    if (selectedStyles.length === 0) {
      alert('Please select at least one photography style');
      return;
    }

    const updatedVenues = venues.map(venue => {
      if (venue.id === selectedVenue) {
        const newImage: GalleryImage = {
          id: editingImage?.id || `img-${Date.now()}`,
          src: imageSrc,
          alt: imageAlt,
          venue: selectedVenue,
          moments: selectedMoments,
          styles: selectedStyles,
        };

        if (editingImage) {
          // Update existing image
          return {
            ...venue,
            images: venue.images.map(img => 
              img.id === editingImage.id ? newImage : img
            ),
          };
        } else {
          // Add new image
          return {
            ...venue,
            images: [...venue.images, newImage],
          };
        }
      }
      return venue;
    });

    setVenues(updatedVenues);
    saveVenues(updatedVenues);
    resetImageForm();
    alert('Image saved successfully!');
  };

  const handleDeleteImage = (venueId: string, imageId: string) => {
    if (!confirm('Are you sure you want to delete this image?')) return;

    const updatedVenues = venues.map(venue => {
      if (venue.id === venueId) {
        return {
          ...venue,
          images: venue.images.filter(img => img.id !== imageId),
        };
      }
      return venue;
    });

    setVenues(updatedVenues);
    saveVenues(updatedVenues);
  };

  const handleEditImage = (image: GalleryImage) => {
    setEditingImage(image);
    setImageSrc(image.src);
    setImageAlt(image.alt);
    setSelectedMoments(image.moments || []);
    setSelectedStyles(image.styles || []);
    setSelectedVenue(image.venue);
    setShowImageForm(true);
    setActiveTab('images');
  };

  const handleSaveVenue = () => {
    if (!venueName || !venueLocation || !venueDescription) {
      alert('Please fill in all required fields');
      return;
    }

    const keywordsArray = venueKeywords
      .split(',')
      .map(k => k.trim())
      .filter(k => k.length > 0);

    if (editingVenue) {
      // Update existing venue
      const updatedVenues = venues.map(venue => {
        if (venue.id === editingVenue.id) {
          return {
            ...venue,
            name: venueName,
            location: venueLocation,
            description: venueDescription,
            keywords: keywordsArray,
          };
        }
        return venue;
      });
      setVenues(updatedVenues);
      saveVenues(updatedVenues);
    } else {
      // Add new venue
      const newVenue: Venue = {
        id: `venue-${Date.now()}`,
        name: venueName,
        location: venueLocation,
        description: venueDescription,
        keywords: keywordsArray,
        images: [],
      };
      const updatedVenues = [...venues, newVenue];
      setVenues(updatedVenues);
      saveVenues(updatedVenues);
      setSelectedVenue(newVenue.id);
    }

    resetVenueForm();
  };

  const handleEditVenue = (venue: Venue) => {
    setEditingVenue(venue);
    setVenueName(venue.name);
    setVenueLocation(venue.location);
    setVenueDescription(venue.description);
    setVenueKeywords(venue.keywords.join(', '));
    setShowVenueForm(true);
  };

  const handleDeleteVenue = (venueId: string) => {
    const venue = venues.find(v => v.id === venueId);
    if (venue && venue.images.length > 0) {
      alert('Cannot delete venue with images. Please delete all images first.');
      return;
    }

    if (!confirm('Are you sure you want to delete this venue?')) return;

    const updatedVenues = venues.filter(v => v.id !== venueId);
    setVenues(updatedVenues);
    saveVenues(updatedVenues);
    
    if (selectedVenue === venueId && updatedVenues.length > 0) {
      setSelectedVenue(updatedVenues[0].id);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-secondary px-6">
        <div className="bg-white p-8 shadow-2xl max-w-md w-full">
          <div className="flex items-center justify-center mb-6">
            <Lock className="text-primary" size={48} />
          </div>
          <h1 className="text-3xl text-center mb-6">Gallery Admin</h1>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block mb-2">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 border border-primary/30 focus:outline-none focus:border-primary"
                placeholder="Enter admin password"
              />
            </div>
            <button
              type="submit"
              className="w-full bg-primary text-white py-3 hover:bg-primary/90 transition-colors"
            >
              Login
            </button>
          </form>
        </div>
      </div>
    );
  }

  const currentVenue = venues.find(v => v.id === selectedVenue);

  return (
    <div className="min-h-screen bg-secondary">
      {/* Header */}
      <div className="bg-primary text-white px-6 py-4 flex items-center justify-between sticky top-0 z-50 shadow-lg">
        <h1 className="text-2xl">Gallery Admin Dashboard</h1>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 transition-colors"
        >
          <LogOut size={18} />
          Logout
        </button>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Venue Management */}
        <div className="bg-white p-6 shadow-lg mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl">Venue Management</h2>
            <button
              onClick={() => {
                resetVenueForm();
                setShowVenueForm(true);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-white hover:bg-primary/90 transition-colors"
            >
              <Plus size={18} />
              Add New Venue
            </button>
          </div>

          {/* Venue List */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            {venues.map(venue => (
              <div
                key={venue.id}
                className={`p-4 border-2 cursor-pointer transition-all ${
                  selectedVenue === venue.id
                    ? 'border-primary bg-primary/5'
                    : 'border-primary/20 hover:border-primary/50'
                }`}
                onClick={() => setSelectedVenue(venue.id)}
              >
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-semibold text-lg">{venue.name}</h3>
                  <div className="flex gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditVenue(venue);
                      }}
                      className="text-primary hover:text-primary/70"
                    >
                      <Save size={16} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteVenue(venue.id);
                      }}
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm text-foreground/60 mb-2">
                  <MapPin size={14} />
                  {venue.location}
                </div>
                <div className="flex items-center gap-2 text-sm text-foreground/60">
                  <Camera size={14} />
                  {venue.images.length} Photos
                </div>
              </div>
            ))}
          </div>

          {/* Venue Form */}
          {showVenueForm && (
            <div className="border-t pt-6 mt-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl">
                  {editingVenue ? 'Edit Venue' : 'New Venue'}
                </h3>
                <button
                  onClick={resetVenueForm}
                  className="text-foreground/60 hover:text-foreground"
                >
                  <X size={24} />
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block mb-2">Venue Name *</label>
                  <input
                    type="text"
                    value={venueName}
                    onChange={(e) => setVenueName(e.target.value)}
                    className="w-full px-4 py-2 border border-primary/30 focus:outline-none focus:border-primary"
                    placeholder="e.g., Oceanview Estate"
                  />
                </div>
                <div>
                  <label className="block mb-2">Location *</label>
                  <input
                    type="text"
                    value={venueLocation}
                    onChange={(e) => setVenueLocation(e.target.value)}
                    className="w-full px-4 py-2 border border-primary/30 focus:outline-none focus:border-primary"
                    placeholder="e.g., Pacific Coast"
                  />
                </div>
              </div>
              <div className="mb-4">
                <label className="block mb-2">Description *</label>
                <textarea
                  value={venueDescription}
                  onChange={(e) => setVenueDescription(e.target.value)}
                  className="w-full px-4 py-2 border border-primary/30 focus:outline-none focus:border-primary"
                  rows={3}
                  placeholder="Brief description of the venue type..."
                />
              </div>
              <div className="mb-4">
                <label className="block mb-2">SEO Keywords (comma separated)</label>
                <input
                  type="text"
                  value={venueKeywords}
                  onChange={(e) => setVenueKeywords(e.target.value)}
                  className="w-full px-4 py-2 border border-primary/30 focus:outline-none focus:border-primary"
                  placeholder="beach wedding, coastal venue, ocean view"
                />
              </div>
              <button
                onClick={handleSaveVenue}
                className="flex items-center gap-2 px-6 py-3 bg-primary text-white hover:bg-primary/90 transition-colors"
              >
                <Save size={18} />
                Save Venue
              </button>
            </div>
          )}
        </div>

        {/* Image Management */}
        {currentVenue && (
          <div className="bg-white p-6 shadow-lg">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl mb-2">{currentVenue.name}</h2>
                <p className="text-foreground/60">{currentVenue.images.length} photos in this venue</p>
              </div>
              <button
                onClick={() => {
                  resetImageForm();
                  setShowImageForm(true);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-white hover:bg-primary/90 transition-colors"
              >
                <Upload size={18} />
                Add Photo
              </button>
            </div>

            {/* Image Form */}
            {showImageForm && (
              <div className="border-t pt-6 mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl">
                    {editingImage ? 'Edit Photo' : 'Add New Photo'}
                  </h3>
                  <button
                    onClick={resetImageForm}
                    className="text-foreground/60 hover:text-foreground"
                  >
                    <X size={24} />
                  </button>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block mb-2">Image Source *</label>
                    <input
                      type="text"
                      value={imageSrc}
                      onChange={(e) => setImageSrc(e.target.value)}
                      className="w-full px-4 py-2 border border-primary/30 focus:outline-none focus:border-primary font-mono text-sm"
                      placeholder="figma:asset/... or https://..."
                    />
                    <p className="text-sm text-foreground/60 mt-1">
                      Use figma:asset/[hash].png for uploaded images or full URLs
                    </p>
                  </div>
                  <div>
                    <label className="block mb-2">Image Description *</label>
                    <input
                      type="text"
                      value={imageAlt}
                      onChange={(e) => setImageAlt(e.target.value)}
                      className="w-full px-4 py-2 border border-primary/30 focus:outline-none focus:border-primary"
                      placeholder="Describe the photo for SEO and accessibility"
                    />
                  </div>
                  <div>
                    <label className="block mb-2">Moments</label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {moments.map(moment => (
                        <div key={moment.id} className="flex items-center">
                          <input
                            type="checkbox"
                            checked={selectedMoments.includes(moment.id)}
                            onChange={() => toggleMoment(moment.id)}
                            className="mr-2"
                          />
                          <span className="text-sm">{moment.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block mb-2">Photography Styles</label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {photographyStyles.map(style => (
                        <div key={style.id} className="flex items-center">
                          <input
                            type="checkbox"
                            checked={selectedStyles.includes(style.id)}
                            onChange={() => toggleStyle(style.id)}
                            className="mr-2"
                          />
                          <span className="text-sm">{style.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <button
                    onClick={handleSaveImage}
                    className="flex items-center gap-2 px-6 py-3 bg-primary text-white hover:bg-primary/90 transition-colors"
                  >
                    <Save size={18} />
                    Save Photo
                  </button>
                </div>
              </div>
            )}

            {/* Image Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {currentVenue.images.map(image => (
                <div key={image.id} className="group relative">
                  <div className="aspect-[4/5] bg-secondary overflow-hidden">
                    <img
                      src={image.src}
                      alt={image.alt}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleEditImage(image)}
                      className="p-2 bg-white text-primary hover:bg-primary hover:text-white transition-colors"
                    >
                      <Save size={16} />
                    </button>
                    <button
                      onClick={() => handleDeleteImage(currentVenue.id, image.id)}
                      className="p-2 bg-white text-red-500 hover:bg-red-500 hover:text-white transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                  <div className="mt-2">
                    <p className="text-sm line-clamp-2 mb-2">{image.alt}</p>
                    <div className="flex flex-wrap gap-1">
                      {image.moments?.slice(0, 2).map(momentId => {
                        const moment = moments.find(m => m.id === momentId);
                        return moment ? (
                          <span key={momentId} className="inline-block px-2 py-1 bg-accent text-xs">
                            {moment.name}
                          </span>
                        ) : null;
                      })}
                      {(image.moments?.length || 0) > 2 && (
                        <span className="inline-block px-2 py-1 bg-secondary text-xs">
                          +{(image.moments?.length || 0) - 2} more
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {currentVenue.images.length === 0 && !showImageForm && (
              <div className="text-center py-12 text-foreground/60">
                <Upload size={48} className="mx-auto mb-4 opacity-50" />
                <p>No photos yet. Click "Add Photo" to get started.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}