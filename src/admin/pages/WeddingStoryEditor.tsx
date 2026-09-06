import { AdminActionButton, AdminActionRouterLink } from "../components/ui/AdminActionControl";
import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  AlertCircle,
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  CheckCircle2,
  Plus,
  Save,
  Trash2,
} from "lucide-react";
import { StoryService, type StoryFact } from "../services/StoryService";
import {
  AdminApiService,
  type EditableStory,
  type StorySaveResult,
} from "../services/AdminApiService";
import { WeddingService } from "../services/WeddingService";
import type { WeddingRecord } from "../types/wedding";

function moveItem<T>(items: T[], from: number, to: number) {
  const next = [...items];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

function weddingFactsToRows(
  facts:
    | {
        season?: string;
        ceremonyType?: string;
        ceremonyLocation?: string;
        receptionLocation?: string;
        celebrant?: string;
        photographer?: string;
      }
    | undefined,
): StoryFact[] {
  const rows: StoryFact[] = [
    {
      label: "Season",
      value: facts?.season || "",
    },
    {
      label: "Ceremony",
      value:
        facts?.ceremonyType || "",
    },
    {
      label: "Ceremony Location",
      value:
        facts?.ceremonyLocation ||
        "",
    },
    {
      label: "Reception Location",
      value:
        facts?.receptionLocation ||
        "",
    },
    {
      label: "Celebrant",
      value:
        facts?.celebrant || "",
    },
    {
      label: "Photography",
      value:
        facts?.photographer || "",
    },
  ];

  return rows.filter(
    (row) => row.value.trim(),
  );
}

export function WeddingStoryEditor() {
  const { slug } = useParams();
  const [weddings, setWeddings] = useState<WeddingRecord[]>([]);
  const [story, setStory] = useState<EditableStory | null>(null);
  const [apiOnline, setApiOnline] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveResult, setSaveResult] = useState<StorySaveResult | null>(null);
  const [saveError, setSaveError] = useState("");

  useEffect(() => {
    let cancelled = false;

    WeddingService.load()
      .then((service) => {
        if (!cancelled) {
          setWeddings(
            service.getWeddings(),
          );
        }
      })
      .catch(() => {
        if (!cancelled) {
          setWeddings([]);
        }
      });

    async function loadStory() {
      const [
        repositoryWedding,
        baseStory,
        apiStory,
      ] = await Promise.all([
        AdminApiService.getJsonWedding(
          slug || "",
        ).catch(() => null),
        new StoryService()
          .getStory(slug || "")
          .catch(() => undefined),
        AdminApiService.getWeddingStory(
          slug || "",
        ).catch(() => null),
      ]);

      if (cancelled) return;

      const sourceSlug =
        repositoryWedding?.slug ||
        baseStory?.slug ||
        slug ||
        "";

      if (!sourceSlug) return;

      setStory({
        slug: sourceSlug,
        title:
          apiStory?.title ||
          repositoryWedding?.title ||
          baseStory?.title ||
          "",
        excerpt:
          apiStory?.excerpt ??
          repositoryWedding?.excerpt ??
          baseStory?.excerpt ??
          "",
        intro:
          apiStory?.intro ??
          repositoryWedding?.intro ??
          baseStory?.intro ??
          "",
        paragraphs:
          apiStory?.paragraphs ??
          repositoryWedding?.story ??
          baseStory?.paragraphs ??
          [],
        facts:
          apiStory?.facts ??
          (
            weddingFactsToRows(
              repositoryWedding?.facts,
            ).length
              ? weddingFactsToRows(
                  repositoryWedding?.facts,
                )
              : baseStory?.facts || []
          ),
        updatedAt:
          apiStory?.updatedAt ??
          repositoryWedding?.updatedAt,
      });
    }

    loadStory();

    AdminApiService.health()
      .then(() => {
        if (!cancelled) {
          setApiOnline(true);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setApiOnline(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [slug]);

  const wedding = useMemo(
    () => weddings.find((item) => item.slug === slug),
    [weddings, slug],
  );

  const validationErrors = useMemo(() => {
    if (!story) return ["Story has not loaded."];

    const errors: string[] = [];
    if (!story.title.trim()) errors.push("Title is required.");
    if (!story.intro.trim()) errors.push("Intro is required.");
    if (story.paragraphs.filter((paragraph) => paragraph.trim()).length === 0) {
      errors.push("At least one paragraph is required.");
    }
    return errors;
  }, [story]);

  function updateStory(patch: Partial<EditableStory>) {
    setStory((current) => (current ? { ...current, ...patch } : current));
    setSaveError("");
    setSaveResult(null);
  }

  function updateParagraph(index: number, value: string) {
    if (!story) return;
    const paragraphs = [...story.paragraphs];
    paragraphs[index] = value;
    updateStory({ paragraphs });
  }

  function addParagraph() {
    if (!story) return;
    updateStory({ paragraphs: [...story.paragraphs, ""] });
  }

  function deleteParagraph(index: number) {
    if (!story) return;
    updateStory({
      paragraphs: story.paragraphs.filter((_, itemIndex) => itemIndex !== index),
    });
  }

  function moveParagraph(index: number, direction: -1 | 1) {
    if (!story) return;
    const destination = index + direction;
    if (destination < 0 || destination >= story.paragraphs.length) return;
    updateStory({
      paragraphs: moveItem(story.paragraphs, index, destination),
    });
  }

  function updateFact(index: number, patch: Partial<StoryFact>) {
    if (!story) return;
    updateStory({
      facts: story.facts.map((fact, factIndex) =>
        factIndex === index ? { ...fact, ...patch } : fact,
      ),
    });
  }

  function addFact() {
    if (!story) return;
    updateStory({
      facts: [...story.facts, { label: "", value: "" }],
    });
  }

  function deleteFact(index: number) {
    if (!story) return;
    updateStory({
      facts: story.facts.filter((_, factIndex) => factIndex !== index),
    });
  }

  async function saveStory() {
    if (!story || !slug || validationErrors.length > 0) return;

    setSaving(true);
    setSaveError("");
    setSaveResult(null);

    try {
      const result = await AdminApiService.saveWeddingStory(slug, story);
      setStory(result.story);
      setSaveResult(result);
      setApiOnline(true);
    } catch (error) {
      setSaveError(
        error instanceof Error ? error.message : "Unable to save story.",
      );
      setApiOnline(false);
    } finally {
      setSaving(false);
    }
  }

  if (!weddings.length || !story) {
    return <div className="text-neutral-500">Loading story editor…</div>;
  }

  if (!wedding) {
    return (
      <div className="rounded-[28px] border border-black/10 bg-white p-8">
        <h1 className="text-3xl font-serif mb-4">Wedding not found</h1>
        <Link to="/admin/weddings" className="underline underline-offset-4">
          Back to weddings
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-7">
      <AdminActionRouterLink
        to={`/admin/weddings/${wedding.slug}/story`}
        className="inline-flex items-center gap-2 text-sm text-neutral-600 hover:text-black"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to story
      </AdminActionRouterLink>

      <section className="rounded-[32px] bg-black text-white p-8 md:p-10">
        <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-6">
          <div>
            <p className="uppercase tracking-[0.25em] text-xs text-white/45 mb-4">
              Story Editor
            </p>
            <h1 className="text-4xl md:text-6xl font-serif leading-tight mb-4">
              {wedding.couple}
            </h1>
            <p className="text-white/65">
              Story edits are saved directly into the D1 wedding draft. They do not affect the live site until you publish.
            </p>
          </div>

          <div
            className={`rounded-2xl border px-4 py-3 text-sm ${
              apiOnline
                ? "border-emerald-300/30 bg-emerald-300/10 text-emerald-100"
                : "border-amber-300/30 bg-amber-300/10 text-amber-100"
            }`}
          >
            <div className="flex items-center gap-2">
              {apiOnline ? (
                <CheckCircle2 className="w-4 h-4" />
              ) : (
                <AlertCircle className="w-4 h-4" />
              )}
              {apiOnline ? "Admin API connected" : "Admin API unavailable"}
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-[28px] border border-black/10 bg-white/75 p-7 shadow-[0_18px_60px_rgba(0,0,0,0.04)] space-y-5">
        <label className="block">
          <span className="mb-2 block text-xs uppercase tracking-[0.16em] text-neutral-500">
            Title
          </span>
          <input
            value={story.title}
            onChange={(event) => updateStory({ title: event.target.value })}
            className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm outline-none focus:border-black/30"
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-xs uppercase tracking-[0.16em] text-neutral-500">
            Excerpt
          </span>
          <textarea
            value={story.excerpt}
            onChange={(event) => updateStory({ excerpt: event.target.value })}
            rows={3}
            className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm outline-none focus:border-black/30"
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-xs uppercase tracking-[0.16em] text-neutral-500">
            Intro
          </span>
          <textarea
            value={story.intro}
            onChange={(event) => updateStory({ intro: event.target.value })}
            rows={5}
            className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm outline-none focus:border-black/30"
          />
        </label>
      </section>

      <section className="rounded-[28px] border border-black/10 bg-white/75 p-7 shadow-[0_18px_60px_rgba(0,0,0,0.04)]">
        <div className="flex items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-3xl font-serif">Paragraphs</h2>
          </div>

          <AdminActionButton
            type="button"
            onClick={addParagraph}
            className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-4 py-2 text-sm"
          >
            <Plus className="w-4 h-4" />
            Add paragraph
          </AdminActionButton>
        </div>

        <div className="space-y-4">
          {story.paragraphs.map((paragraph, index) => (
            <div
              key={index}
              className="rounded-2xl border border-black/10 bg-white p-5"
            >
              <div className="flex items-center justify-between gap-4 mb-3">
                <p className="text-xs uppercase tracking-[0.16em] text-neutral-500">
                  Paragraph {index + 1}
                </p>

                <div className="flex gap-2">
                  <AdminActionButton aria-label="Move up"
                    type="button"
                    onClick={() => moveParagraph(index, -1)}
                    disabled={index === 0}
                    className="rounded-full border border-black/10 p-2 disabled:opacity-30"
                  >
                    <ArrowUp className="w-4 h-4" />
                  </AdminActionButton>
                  <AdminActionButton aria-label="Move down"
                    type="button"
                    onClick={() => moveParagraph(index, 1)}
                    disabled={index === story.paragraphs.length - 1}
                    className="rounded-full border border-black/10 p-2 disabled:opacity-30"
                  >
                    <ArrowDown className="w-4 h-4" />
                  </AdminActionButton>
                  <AdminActionButton aria-label="Remove"
                    type="button"
                    onClick={() => deleteParagraph(index)}
                    className="rounded-full border border-red-200 p-2 text-red-600"
                  >
                    <Trash2 className="w-4 h-4" />
                  </AdminActionButton>
                </div>
              </div>

              <textarea
                value={paragraph}
                onChange={(event) =>
                  updateParagraph(index, event.target.value)
                }
                rows={6}
                className="w-full rounded-2xl border border-black/10 bg-neutral-50 px-4 py-3 text-sm leading-relaxed outline-none focus:border-black/30"
              />
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-[28px] border border-black/10 bg-white/75 p-7 shadow-[0_18px_60px_rgba(0,0,0,0.04)]">
        <div className="flex items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-3xl font-serif">Facts</h2>
          </div>

          <AdminActionButton
            type="button"
            onClick={addFact}
            className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-4 py-2 text-sm"
          >
            <Plus className="w-4 h-4" />
            Add fact
          </AdminActionButton>
        </div>

        <div className="space-y-3">
          {story.facts.map((fact, index) => (
            <div
              key={index}
              className="grid grid-cols-1 xl:grid-cols-[0.8fr_1.2fr_auto] gap-3"
            >
              <input
                value={fact.label}
                onChange={(event) =>
                  updateFact(index, { label: event.target.value })
                }
                placeholder="Label"
                className="rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm"
              />
              <input
                value={fact.value}
                onChange={(event) =>
                  updateFact(index, { value: event.target.value })
                }
                placeholder="Value"
                className="rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm"
              />
              <AdminActionButton aria-label="Remove"
                type="button"
                onClick={() => deleteFact(index)}
                className="rounded-full border border-red-200 p-3 text-red-600"
              >
                <Trash2 className="w-4 h-4" />
              </AdminActionButton>
            </div>
          ))}
        </div>
      </section>

      {validationErrors.length > 0 ? (
        <section className="rounded-[24px] border border-amber-200 bg-amber-50 p-5 text-amber-900">
          {validationErrors.map((error) => (
            <p key={error}>{error}</p>
          ))}
        </section>
      ) : null}

      <div className="flex flex-wrap gap-3">
        <AdminActionButton
          type="button"
          onClick={saveStory}
          disabled={
            saving || !apiOnline || validationErrors.length > 0
          }
          className="inline-flex items-center gap-2 rounded-full bg-black px-5 py-3 text-sm text-white hover:bg-black/90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Save className="w-4 h-4" />
          {saving ? "Saving..." : "Save story"}
        </AdminActionButton>

        <AdminActionRouterLink
          to={`/admin/weddings/${wedding.slug}/story`}
          className="inline-flex items-center rounded-full border border-black/10 bg-white px-5 py-3 text-sm"
        >
          Preview
        </AdminActionRouterLink>
      </div>

      {saveResult ? (
        <section className="rounded-[24px] border border-emerald-200 bg-emerald-50 p-5 text-emerald-900">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 mt-0.5" />
            <div>
              <p className="font-medium">Story saved.</p>
              {saveResult.backupPath ? (
                <p className="text-sm mt-1">
                  Backup: {saveResult.backupPath}
                </p>
              ) : null}
            </div>
          </div>
        </section>
      ) : null}

      {saveError ? (
        <section className="rounded-[24px] border border-red-200 bg-red-50 p-5 text-red-900">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 mt-0.5" />
            <p>{saveError}</p>
          </div>
        </section>
      ) : null}
    </div>
  );
}
