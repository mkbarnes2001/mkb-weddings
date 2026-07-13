import type { WeddingDocument } from "./WeddingTypes";

export type WeddingValidationResult = {
  valid: boolean;
  errors: string[];
};

export function validateWeddingDocument(
  value: unknown,
): WeddingValidationResult {
  const errors: string[] = [];

  if (!value || typeof value !== "object") {
    return {
      valid: false,
      errors: ["Wedding document must be an object."],
    };
  }

  const wedding = value as Partial<WeddingDocument>;

  if (wedding.schemaVersion !== 1) {
    errors.push("schemaVersion must be 1.");
  }

  if (!wedding.slug?.trim()) errors.push("slug is required.");
  if (!wedding.title?.trim()) errors.push("title is required.");
  if (!wedding.couple?.trim()) errors.push("couple is required.");
  if (!wedding.venue?.trim()) errors.push("venue is required.");
  if (!wedding.weddingDate?.trim()) errors.push("weddingDate is required.");
  if (!wedding.excerpt?.trim()) errors.push("excerpt is required.");
  if (!wedding.intro?.trim()) errors.push("intro is required.");

  if (!Array.isArray(wedding.story) || wedding.story.length === 0) {
    errors.push("story must contain at least one paragraph.");
  } else if (
    wedding.story.some(
      (paragraph) => typeof paragraph !== "string" || !paragraph.trim(),
    )
  ) {
    errors.push("every story paragraph must be a non-empty string.");
  }

  if (
    wedding.suppliers &&
    (!Array.isArray(wedding.suppliers) ||
      wedding.suppliers.some(
        (supplier) =>
          !supplier ||
          typeof supplier !== "object" ||
          !supplier.role?.trim() ||
          !supplier.name?.trim(),
      ))
  ) {
    errors.push("every supplier must contain role and name.");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export function assertWeddingDocument(
  value: unknown,
): asserts value is WeddingDocument {
  const result = validateWeddingDocument(value);

  if (!result.valid) {
    throw new Error(
      `Invalid wedding document: ${result.errors.join(" ")}`,
    );
  }
}
