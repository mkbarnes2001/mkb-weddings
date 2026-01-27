import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { MapPin, ArrowLeft, ExternalLink } from "lucide-react";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { ImageLightbox } from "./ImageLightbox";

/* ---------------- TYPES ---------------- */

type GalleryRow = {
  venue: string;
  category: string;
  filename: string;
  tags?: string;
};

type VenueDescRow = {
  venue: string;
  venueName: string;
  venueLocation: string;
  venueWebsite?: string;
  venueDescription: string;
};

/* ---------------- R2 PATHS ---------------- */

const THUMB_BASE =
  "https://pub-396aa8eae3b14a459d2cebca6fe95f55.r2.dev/thumb";
const FULL_BASE =
  "https://pub-396aa8eae3b14a459d2cebca6fe95f55.r2.dev/full";

/* ---------------- HELPERS ---------------- */

const slugify = (s: string) =>
  s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

const thumbUrl = (r: GalleryRow) =>
  `${THUMB_BASE}/${encodeURIComponent(r.venue)}/${encodeURIComponent(
    r.category
  )}/${encodeURIComponent(r.filename)}`;

const fullUrl = (r: GalleryRow) =>
  `${FULL_BASE}/${encodeURIComponent(r.venue)}/${encodeURIComponent(
    r.category
  )}/${encodeURIComponent(r.filename.replace("_500.webp", "_2000.webp"))}`;

const buildAlt = (r: GalleryRow, i: number) =>
  `${r.venue} wedding photography – ${r.category} image ${i}`;

/* ---------------- CSV PARSERS ---------------- */

function parseCsv<T = any>(text: string): string[][] {
  return text
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => {
      const out: string[] = [];
      let cur = "";
      let q = false;
      for (const c of line) {
        if (c === '"') q = !q;
        else if (c === "," && !q) {
          out.push(cur.trim());
          cur = "";
        } else cur += c;
      }
      out.push(cur.trim());
      return out;
    });
}

/* ---------------- COMPONENT ---------------- */

export function GalleryVenueDetail() {
  const { venueId } = useParams<{ venueId: string }>();

  const [gallery, setGallery] = useState<GalleryRow[]>([]);
  const [venueInfo, setVenueInfo] = useState<VenueDescRow | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  /* -------- LOAD CSV FILES -------- */

  useEffect(() => {
    (async () => {
      const galleryCsv = await fetch("/gallery.csv").then((r) => r.text());
      const venueCsv = await fetch("/galleryvenuedesc.csv").then((r) =>
        r.text()
      );

      const gRows = parseCsv(galleryCsv);
      const gHead = gRows[0].map((h) => h.toLowerCase());

      const galleryData: GalleryRow[] = gRows.slice(1).map((r) => ({
        venue: r[gHead.indexOf("venue")],
        category: r[gHead.indexOf("category")],
        filename: r[gHead.indexOf("filename")],
        tags: r[gHead.indexOf("tags")],
      }));

      setGallery(galleryData);

      const vRows = parseCsv(venueCsv);
      const vHead = vRows[0].map((h) => h.toLowerCase());

      const venueMatch = vRows
        .slice(1)
        .map((r) => ({
