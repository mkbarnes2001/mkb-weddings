export type SupplierQualityState = "needs_review" | "needs_details" | "complete";
export const supplierQualityLabels: Record<SupplierQualityState, string> = {
  needs_review: "Needs review", needs_details: "Needs details", complete: "Complete",
};

// Completeness describes stored details, not independent verification of a business.
export function supplierQuality(supplier: {
  name?: string; category?: string; website?: string; email?: string;
  phone?: string; instagram?: string; location?: string; county?: string;
}, pendingReviewCount = 0) {
  const has = (value?: string) => Boolean(String(value || "").trim());
  const missingDetails: string[] = [];
  if (!has(supplier.name)) missingDetails.push("Business name");
  if (!has(supplier.category)) missingDetails.push("Category");
  if (![supplier.website, supplier.email, supplier.phone, supplier.instagram].some(has)) missingDetails.push("Website, email, phone or Instagram");
  if (![supplier.location, supplier.county].some(has)) missingDetails.push("Location or county");
  const qualityState: SupplierQualityState = pendingReviewCount > 0 ? "needs_review" : missingDetails.length ? "needs_details" : "complete";
  return { qualityState, missingDetails };
}
