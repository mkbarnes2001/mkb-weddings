import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, ExternalLink, Instagram, Pencil, Users } from "lucide-react";
import { WeddingService } from "../services/WeddingService";
import type { WeddingRecord } from "../types/wedding";
import { SupplierService, type SupplierRecord } from "../services/SupplierService";
import { AdminPageHeader } from "../components/ui/AdminUI";

export function WeddingSuppliers() {
  const { slug } = useParams();
  const [weddings, setWeddings] = useState<WeddingRecord[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierRecord[]>([]);

  useEffect(() => {
    WeddingService.load().then((service) => setWeddings(service.getWeddings()));
    SupplierService.load().then((service) => setSuppliers(service.getSuppliersForWedding(slug || "")));
  }, [slug]);

  const wedding = useMemo(() => weddings.find((item) => item.slug === slug), [weddings, slug]);
  if (!weddings.length) return <div className="text-neutral-500">Loading suppliers…</div>;
  if (!wedding) return <div className="rounded-[28px] border border-black/10 bg-white p-8"><h1 className="text-3xl font-serif mb-4">Wedding not found</h1><Link to="/admin/weddings" className="underline underline-offset-4">Back to weddings</Link></div>;

  return (
    <div className="space-y-7">
      <AdminPageHeader
        eyebrow={
          <Link
            to={`/admin/weddings/${wedding.slug}`}
            className="admin-inline-link inline-flex items-center gap-1"
          >
            <ArrowLeft size={13} />
            Back to wedding
          </Link>
        }
        title="Suppliers"
        meta={
          <div className="flex flex-wrap items-center gap-2">
            <span>{wedding.couple}</span>
            <span className="text-neutral-400">·</span>
            <span>{wedding.venue}</span>
            <span className="text-neutral-400">
              {suppliers.length} supplier rows
            </span>
          </div>
        }
        actions={
          <Link
            to={`/admin/weddings/${wedding.slug}/suppliers/edit`}
            className="admin-button admin-button--primary"
          >
            <Pencil className="admin-button__icon" />
            Edit suppliers
          </Link>
        }
      />

      {suppliers.length === 0 ? (
        <section className="rounded-[28px] border border-amber-200 bg-amber-50 p-7 text-amber-900"><div className="flex items-start gap-4"><Users className="w-6 h-6 mt-1" /><div><h2 className="text-2xl font-serif mb-2">No suppliers added yet</h2><p className="text-sm leading-relaxed">Open the supplier editor to add supplier records directly to this D1 wedding draft.</p></div></div></section>
      ) : (
        <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">{suppliers.map((supplier, index) => (
          <article key={`${supplier.role}-${supplier.name}-${index}`} className="rounded-[28px] border border-black/10 bg-white/75 p-6 shadow-[0_18px_60px_rgba(0,0,0,0.04)]"><p className="text-xs uppercase tracking-[0.2em] text-neutral-500 mb-3">{supplier.role || "Supplier"}</p><h2 className="text-2xl font-serif mb-4">{supplier.name || "Unnamed supplier"}</h2><div className="space-y-3 text-sm">{supplier.website ? <a href={supplier.website} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 underline underline-offset-4"><ExternalLink className="w-4 h-4" />Website</a> : <p className="text-neutral-400">No website</p>}{supplier.instagram ? <a href={`https://instagram.com/${supplier.instagram.replace(/^@/, "")}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 underline underline-offset-4"><Instagram className="w-4 h-4" />@{supplier.instagram.replace(/^@/, "")}</a> : <p className="text-neutral-400">No Instagram</p>}</div></article>
        ))}</section>
      )}
    </div>
  );
}
