export function PlaceholderPage({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-[32px] bg-black text-white p-8 md:p-10">
      <p className="uppercase tracking-[0.25em] text-xs text-white/45 mb-4">
        Photography Intelligence
      </p>
      <h1 className="text-4xl md:text-6xl font-serif leading-tight mb-5">{title}</h1>
      <p className="text-white/65 max-w-2xl text-lg">{description}</p>
    </div>
  );
}
