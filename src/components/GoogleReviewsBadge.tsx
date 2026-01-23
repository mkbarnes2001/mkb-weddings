export function GoogleReviewsBadge() {
  return (
    <a
      href="https://www.google.com/search?q=MKB+Weddings+reviews"
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-3 rounded-xl border border-neutral-200 px-5 py-3 hover:bg-neutral-50 transition"
    >
      <img
        src="https://www.gstatic.com/images/branding/googlelogo/2x/googlelogo_color_92x30dp.png"
        alt="Google"
        className="h-5"
      />

      <div className="flex items-center gap-1 text-yellow-500">
        {Array.from({ length: 5 }).map((_, i) => (
          <svg
            key={i}
            viewBox="0 0 20 20"
            fill="currentColor"
            className="w-4 h-4"
          >
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.97a1 1 0 00.95.69h4.175c.969 0 1.371 1.24.588 1.81l-3.38 2.455a1 1 0 00-.364 1.118l1.287 3.97c.3.921-.755 1.688-1.538 1.118l-3.381-2.455a1 1 0 00-1.175 0l-3.38 2.455c-.783.57-1.838-.197-1.539-1.118l1.287-3.97a1 1 0 00-.364-1.118L2 9.397c-.783-.57-.38-1.81.588-1.81h4.175a1 1 0 00.95-.69l1.286-3.97z" />
          </svg>
        ))}
      </div>

      <div className="text-sm text-neutral-700">
        <strong>5.0</strong> · 120+ Google Reviews
      </div>
    </a>
  );
}