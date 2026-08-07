import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, BookOpen, FileText, ListChecks, Pencil } from "lucide-react";
import { StoryService, type StoryRecord } from "../services/StoryService";
import { WeddingService } from "../services/WeddingService";
import type { WeddingRecord } from "../types/wedding";
import { ProgressBar } from "../components/ProgressBar";
import { StatusBadge } from "../components/Badge";
import { AdminPageHeader } from "../components/ui/AdminUI";

export function WeddingStory() {
  const { slug } = useParams();
  const [stories, setStories] = useState<StoryRecord[]>([]);
  const [weddings, setWeddings] = useState<WeddingRecord[]>([]);

  useEffect(() => {
    new StoryService().getStories().then(setStories);
    WeddingService.load().then((service) => setWeddings(service.getWeddings()));
  }, []);

  const story = useMemo(
    () => stories.find((item) => item.slug === slug),
    [stories, slug],
  );

  const wedding = useMemo(
    () => weddings.find((item) => item.slug === slug),
    [weddings, slug],
  );

  if (!stories.length || !weddings.length) {
    return <div className="text-neutral-500">Loading story intelligence…</div>;
  }

  if (!story || !wedding) {
    return (
      <div className="rounded-[28px] border border-black/10 bg-white p-8">
        <h1 className="text-3xl font-serif mb-4">Story not found</h1>
        <Link to="/admin/weddings" className="underline underline-offset-4">
          Back to weddings
        </Link>
      </div>
    );
  }

  const wordCount = [
    story.title,
    story.excerpt,
    story.intro,
    ...story.paragraphs,
  ]
    .join(" ")
    .split(/\s+/)
    .filter(Boolean).length;

  return (
    <div className="space-y-7">
      <AdminPageHeader
        eyebrow={
          <Link
            to={`/admin/weddings/${story.slug}`}
            className="admin-inline-link inline-flex items-center gap-1"
          >
            <ArrowLeft size={13} />
            Back to wedding
          </Link>
        }
        title="Story"
        meta={
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={wedding.status} />
            <span>{story.title}</span>
            <span className="text-neutral-400">·</span>
            <span>{story.venue}</span>
          </div>
        }
        actions={
          <Link
            to={`/admin/weddings/${story.slug}/content`}
            className="admin-button admin-button--primary"
          >
            <Pencil className="admin-button__icon" />
            Edit master content
          </Link>
        }
      />

      <section className="grid grid-cols-1 lg:grid-cols-4 gap-5">
        <div className="rounded-[28px] border border-black/10 bg-white/75 p-6 shadow-[0_18px_60px_rgba(0,0,0,0.04)]">
          <p className="text-xs uppercase tracking-[0.2em] text-neutral-500 mb-3">Paragraphs</p>
          <p className="text-5xl font-serif">{story.paragraphs.length}</p>
        </div>

        <div className="rounded-[28px] border border-black/10 bg-white/75 p-6 shadow-[0_18px_60px_rgba(0,0,0,0.04)]">
          <p className="text-xs uppercase tracking-[0.2em] text-neutral-500 mb-3">Word count</p>
          <p className="text-5xl font-serif">{wordCount}</p>
        </div>

        <div className="rounded-[28px] border border-black/10 bg-white/75 p-6 shadow-[0_18px_60px_rgba(0,0,0,0.04)]">
          <p className="text-xs uppercase tracking-[0.2em] text-neutral-500 mb-3">Facts</p>
          <p className="text-5xl font-serif">{story.facts.length}</p>
        </div>

        <div className="rounded-[28px] border border-black/10 bg-white/75 p-6 shadow-[0_18px_60px_rgba(0,0,0,0.04)]">
          <p className="text-xs uppercase tracking-[0.2em] text-neutral-500 mb-3">Story suppliers</p>
          <p className="text-5xl font-serif">{story.supplierCountFromStory}</p>
        </div>
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-[1.1fr_0.9fr] gap-5">
        <article className="rounded-[28px] border border-black/10 bg-white/75 p-7 shadow-[0_18px_60px_rgba(0,0,0,0.04)]">
          <div className="flex items-center gap-3 mb-6">
            <div className="rounded-2xl bg-black text-white p-3">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-3xl font-serif">Story text</h2>
              <p className="text-sm text-neutral-500">
                Preview including saved admin overrides.
              </p>
            </div>
          </div>

          {story.excerpt ? (
            <div className="mb-6 rounded-2xl bg-[#f5f3ef] border border-black/5 p-5">
              <p className="text-xs uppercase tracking-[0.2em] text-neutral-500 mb-2">Excerpt</p>
              <p className="text-neutral-700 leading-relaxed">{story.excerpt}</p>
            </div>
          ) : null}

          {story.intro ? (
            <div className="mb-8">
              <p className="text-xs uppercase tracking-[0.2em] text-neutral-500 mb-2">Intro</p>
              <p className="text-lg font-serif leading-relaxed text-neutral-800">{story.intro}</p>
            </div>
          ) : null}

          <div className="space-y-5">
            {story.paragraphs.map((paragraph, index) => (
              <div key={index} className="rounded-2xl border border-black/5 bg-white/60 p-5">
                <p className="text-xs uppercase tracking-[0.2em] text-neutral-400 mb-2">
                  Paragraph {index + 1}
                </p>
                <p className="text-sm leading-relaxed text-neutral-700">{paragraph}</p>
              </div>
            ))}
          </div>
        </article>

        <aside className="space-y-5">
          <section className="rounded-[28px] border border-black/10 bg-white/75 p-7 shadow-[0_18px_60px_rgba(0,0,0,0.04)]">
            <div className="flex items-center gap-3 mb-6">
              <div className="rounded-2xl bg-black text-white p-3">
                <ListChecks className="w-5 h-5" />
              </div>
              <h2 className="text-3xl font-serif">Facts</h2>
            </div>

            {story.facts.length > 0 ? (
              <div className="space-y-3">
                {story.facts.map((fact) => (
                  <div key={`${fact.label}-${fact.value}`} className="rounded-2xl bg-[#f5f3ef] border border-black/5 p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-neutral-500 mb-2">
                      {fact.label}
                    </p>
                    <p className="text-sm text-neutral-800">{fact.value}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-neutral-500">No facts found.</p>
            )}
          </section>

          <section className="rounded-[28px] border border-black/10 bg-white/75 p-7 shadow-[0_18px_60px_rgba(0,0,0,0.04)]">
            <div className="flex items-center gap-3 mb-6">
              <div className="rounded-2xl bg-black text-white p-3">
                <FileText className="w-5 h-5" />
              </div>
              <h2 className="text-3xl font-serif">AI readiness</h2>
            </div>

            <div className="space-y-6">
              <ProgressBar label="Visual tags" done={wedding.tagsComplete} total={wedding.imageCount} />
              <ProgressBar label="Alt text" done={wedding.altComplete} total={wedding.imageCount} />
              <ProgressBar label="Captions" done={wedding.captionComplete} total={wedding.imageCount} />
            </div>
          </section>
        </aside>
      </section>
    </div>
  );
}
