export type PackagePresentation = {
  placement: "above" | "below";
  fit: "cover" | "contain";
  positionX: number;
  positionY: number;
};
export function packagePresentation(input?: Partial<PackagePresentation> | null): PackagePresentation {
  const position = (value: unknown) => value !== null && value !== undefined && Number.isFinite(Number(value)) ? Math.max(0, Math.min(100, Number(value))) : 50;
  return { placement: input?.placement === "below" ? "below" : "above", fit: input?.fit === "contain" ? "contain" : "cover", positionX: position(input?.positionX), positionY: position(input?.positionY) };
}
