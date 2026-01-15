# Blog Admin Instructions

## How to Access the Blog Admin

After you publish your website, you can add new blog posts using the admin interface.

### Accessing the Admin Panel

1. Go to your website URL and add `#admin` at the end
   - Example: `https://yourwebsite.com/#admin`
   
2. You'll see a login screen

3. Enter the password: `mkbweddings2025`
   - **IMPORTANT**: You can change this password by editing `/components/BlogAdmin.tsx` and changing the `ADMIN_PASSWORD` value on line 29

## Adding a New Blog Post

### Step 1: Click "New Post"

Click the green "New Post" button in the top right corner.

### Step 2: Fill in the Form

**Required Fields:**
- **Title**: The blog post title (e.g., "Killeavy Castle wedding photography, Sarah & John")
- **Excerpt**: A short description that appears on the blog listing page
- **Content**: The full blog post text - include venue details, vendor credits, and your story
- **Featured Image URL**: The main image URL for the blog card
- **Date**: Use the format "January 15, 2025"

**Optional Fields:**
- **Read Time**: How long it takes to view (e.g., "5 min read")
  - Formula: Number of images ÷ 10 = minutes
  - Example: 50 images = 5 min read
- **Category**: Default is "Real Weddings"
- **Tags**: Comma-separated keywords (e.g., "NIweddings, killeavycastle, weddingphotography")

### Step 3: Add Gallery Images

In the "Gallery Images" field:
1. Paste your image URLs, **one URL per line**
2. No commas needed - just press Enter after each URL
3. The counter at the bottom shows you how many images you've added

Example:
```
https://mkbweddings.com/wp-content/uploads/image-1.jpg
https://mkbweddings.com/wp-content/uploads/image-2.jpg
https://mkbweddings.com/wp-content/uploads/image-3.jpg
```

### Step 4: Save

Click the "Save Post" button. Your post will be saved and appear immediately on your blog page.

## Managing Existing Posts

### Edit a Post
- Click the eye icon next to any post
- Make your changes
- Click "Save Post"

### Delete a Post
- Click the trash icon next to any post
- Confirm the deletion

## How It Works

- **Your custom posts are stored in your browser's localStorage**
- They persist even after you close the browser
- They appear alongside your hardcoded blog posts (the ones we added in code)
- Custom posts appear FIRST, before the hardcoded posts
- Each visitor's browser stores the data independently (only you can see/edit admin posts)

## Tips

1. **Backup Your Posts**: Your posts are stored in the browser. If you clear browser data, they'll be deleted. Consider keeping a backup copy of your image URLs.

2. **Read Time Calculation**: 
   - 50 images = "5 min read"
   - 100 images = "10 min read"
   - 131 images = "13 min read"
   - 149 images = "15 min read"

3. **Date Format**: Always use the same format as existing posts for consistency:
   - ✅ "January 15, 2025"
   - ❌ "01/15/2025"
   - ❌ "Jan 15, 2025"

4. **Image URLs**: Make sure all URLs start with `https://` and are publicly accessible

5. **Security**: Change the admin password before publishing! Edit `/components/BlogAdmin.tsx` line 29.

## Accessing From Anywhere

The admin panel is part of your published website, so you can:
- Access it from any device
- Add posts from your phone, tablet, or computer
- Manage posts from anywhere with internet access

Just remember: `yourwebsite.com/#admin` + your password = instant blog post management!
