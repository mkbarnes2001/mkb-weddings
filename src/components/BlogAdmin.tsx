import { useState, useEffect } from 'react';
import { Plus, Trash2, Eye, Save, Lock, LogOut } from 'lucide-react';

interface BlogPost {
  id: string;
  title: string;
  excerpt: string;
  content: string;
  image: string;
  date: string;
  readTime: string;
  category: string;
  tags: string[];
  galleryImages: string[];
}

export function BlogAdmin() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingPost, setEditingPost] = useState<BlogPost | null>(null);
  
  // Form fields
  const [title, setTitle] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [content, setContent] = useState('');
  const [image, setImage] = useState('');
  const [date, setDate] = useState('');
  const [readTime, setReadTime] = useState('');
  const [category, setCategory] = useState('Real Weddings');
  const [tags, setTags] = useState('');
  const [galleryImages, setGalleryImages] = useState('');

  // Simple password protection - change this to your desired password
  const ADMIN_PASSWORD = 'mkbweddings2025';

  useEffect(() => {
    // Load posts from localStorage
    const savedPosts = localStorage.getItem('mkb_blog_posts');
    if (savedPosts) {
      setPosts(JSON.parse(savedPosts));
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

  const resetForm = () => {
    setTitle('');
    setExcerpt('');
    setContent('');
    setImage('');
    setDate('');
    setReadTime('');
    setCategory('Real Weddings');
    setTags('');
    setGalleryImages('');
    setEditingPost(null);
  };

  const handleSavePost = () => {
    if (!title || !excerpt || !content || !image || !date) {
      alert('Please fill in all required fields');
      return;
    }

    const galleryImagesArray = galleryImages
      .split('\n')
      .map(url => url.trim())
      .filter(url => url.length > 0);

    const tagsArray = tags
      .split(',')
      .map(tag => tag.trim())
      .filter(tag => tag.length > 0);

    const newPost: BlogPost = {
      id: editingPost?.id || `custom-${Date.now()}`,
      title,
      excerpt,
      content,
      image,
      date,
      readTime,
      category,
      tags: tagsArray,
      galleryImages: galleryImagesArray,
    };

    let updatedPosts: BlogPost[];
    if (editingPost) {
      // Update existing post
      updatedPosts = posts.map(p => p.id === editingPost.id ? newPost : p);
    } else {
      // Add new post
      updatedPosts = [newPost, ...posts];
    }

    setPosts(updatedPosts);
    localStorage.setItem('mkb_blog_posts', JSON.stringify(updatedPosts));
    
    setShowForm(false);
    resetForm();
    alert('Post saved successfully!');
  };

  const handleEditPost = (post: BlogPost) => {
    setEditingPost(post);
    setTitle(post.title);
    setExcerpt(post.excerpt);
    setContent(post.content);
    setImage(post.image);
    setDate(post.date);
    setReadTime(post.readTime);
    setCategory(post.category);
    setTags(post.tags.join(', '));
    setGalleryImages(post.galleryImages.join('\n'));
    setShowForm(true);
  };

  const handleDeletePost = (id: string) => {
    if (confirm('Are you sure you want to delete this post?')) {
      const updatedPosts = posts.filter(p => p.id !== id);
      setPosts(updatedPosts);
      localStorage.setItem('mkb_blog_posts', JSON.stringify(updatedPosts));
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#faf9f7] flex items-center justify-center px-4">
        <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full">
          <div className="flex items-center justify-center mb-6">
            <Lock className="w-12 h-12 text-[#7ba5a3]" />
          </div>
          <h2 className="text-2xl text-center mb-6 text-[#2d4a5a]">Blog Admin Login</h2>
          <form onSubmit={handleLogin}>
            <div className="mb-4">
              <label className="block text-[#2d4a5a] mb-2">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-[#7ba5a3]"
                placeholder="Enter admin password"
              />
            </div>
            <button
              type="submit"
              className="w-full bg-[#7ba5a3] text-white py-3 rounded-lg hover:bg-[#6a9492] transition-colors"
            >
              Login
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#faf9f7] py-12 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex justify-between items-center">
            <h1 className="text-3xl text-[#2d4a5a]">Blog Admin</h1>
            <div className="flex gap-4">
              <button
                onClick={() => {
                  resetForm();
                  setShowForm(!showForm);
                }}
                className="flex items-center gap-2 bg-[#7ba5a3] text-white px-6 py-2 rounded-lg hover:bg-[#6a9492] transition-colors"
              >
                <Plus className="w-5 h-5" />
                New Post
              </button>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 bg-gray-600 text-white px-6 py-2 rounded-lg hover:bg-gray-700 transition-colors"
              >
                <LogOut className="w-5 h-5" />
                Logout
              </button>
            </div>
          </div>
        </div>

        {/* Form */}
        {showForm && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-2xl text-[#2d4a5a] mb-6">
              {editingPost ? 'Edit Post' : 'Create New Post'}
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-[#2d4a5a] mb-2">Title *</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-[#7ba5a3]"
                  placeholder="e.g., Killeavy Castle wedding photography, Sarah & John"
                />
              </div>

              <div>
                <label className="block text-[#2d4a5a] mb-2">Excerpt *</label>
                <textarea
                  value={excerpt}
                  onChange={(e) => setExcerpt(e.target.value)}
                  rows={2}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-[#7ba5a3]"
                  placeholder="Short description for the blog list"
                />
              </div>

              <div>
                <label className="block text-[#2d4a5a] mb-2">Content *</label>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={6}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-[#7ba5a3]"
                  placeholder="Full blog post content..."
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[#2d4a5a] mb-2">Featured Image URL *</label>
                  <input
                    type="text"
                    value={image}
                    onChange={(e) => setImage(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-[#7ba5a3]"
                    placeholder="https://..."
                  />
                </div>

                <div>
                  <label className="block text-[#2d4a5a] mb-2">Date *</label>
                  <input
                    type="text"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-[#7ba5a3]"
                    placeholder="e.g., January 15, 2025"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[#2d4a5a] mb-2">Read Time</label>
                  <input
                    type="text"
                    value={readTime}
                    onChange={(e) => setReadTime(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-[#7ba5a3]"
                    placeholder="e.g., 5 min read"
                  />
                </div>

                <div>
                  <label className="block text-[#2d4a5a] mb-2">Category</label>
                  <input
                    type="text"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-[#7ba5a3]"
                    placeholder="e.g., Real Weddings"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[#2d4a5a] mb-2">Tags (comma-separated)</label>
                <input
                  type="text"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-[#7ba5a3]"
                  placeholder="e.g., NIweddings, killeavycastle, weddingphotography"
                />
              </div>

              <div>
                <label className="block text-[#2d4a5a] mb-2">Gallery Images (one URL per line)</label>
                <textarea
                  value={galleryImages}
                  onChange={(e) => setGalleryImages(e.target.value)}
                  rows={10}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-[#7ba5a3] font-mono text-sm"
                  placeholder="https://mkbweddings.com/wp-content/uploads/image-1.jpg&#10;https://mkbweddings.com/wp-content/uploads/image-2.jpg&#10;https://mkbweddings.com/wp-content/uploads/image-3.jpg"
                />
                <p className="text-sm text-gray-600 mt-1">
                  Paste one image URL per line. Total images: {galleryImages.split('\n').filter(url => url.trim()).length}
                </p>
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  onClick={handleSavePost}
                  className="flex items-center gap-2 bg-[#7ba5a3] text-white px-6 py-3 rounded-lg hover:bg-[#6a9492] transition-colors"
                >
                  <Save className="w-5 h-5" />
                  Save Post
                </button>
                <button
                  onClick={() => {
                    setShowForm(false);
                    resetForm();
                  }}
                  className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-[#2d4a5a]"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Posts List */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-2xl text-[#2d4a5a] mb-6">Your Custom Posts ({posts.length})</h2>
          
          {posts.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <p className="text-lg">No custom posts yet.</p>
              <p className="text-sm mt-2">Click "New Post" to create your first blog post.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {posts.map((post) => (
                <div key={post.id} className="border border-gray-200 rounded-lg p-4 hover:border-[#7ba5a3] transition-colors">
                  <div className="flex gap-4">
                    {post.image && (
                      <img
                        src={post.image}
                        alt={post.title}
                        className="w-32 h-24 object-cover rounded"
                      />
                    )}
                    <div className="flex-1">
                      <h3 className="text-lg text-[#2d4a5a] mb-1">{post.title}</h3>
                      <p className="text-sm text-gray-600 mb-2">{post.excerpt}</p>
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span>{post.date}</span>
                        <span>{post.galleryImages.length} images</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEditPost(post)}
                        className="p-2 text-[#7ba5a3] hover:bg-[#7ba5a3] hover:text-white rounded transition-colors"
                        title="Edit"
                      >
                        <Eye className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleDeletePost(post.id)}
                        className="p-2 text-red-600 hover:bg-red-600 hover:text-white rounded transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mt-6">
          <h3 className="text-lg mb-2 text-[#2d4a5a]">💡 Tips for adding posts:</h3>
          <ul className="space-y-2 text-sm text-gray-700">
            <li>• Use the same date format as existing posts (e.g., "January 15, 2025")</li>
            <li>• Gallery images should be full URLs starting with https://</li>
            <li>• Read time is calculated as: number of images ÷ 10 (e.g., 50 images = 5 min read)</li>
            <li>• Posts are stored in your browser's localStorage and will persist across sessions</li>
            <li>• Your custom posts will appear alongside the hardcoded posts on the blog page</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
