export type MomentRecord = {
  id: string;
  name: string;
  slug: string;
  description: string;
  availableForAssignment: boolean;
  showOnMomentsLanding: boolean;
  cardImageId: string;
  sortOrder: number;
  status: "active" | "archived";
};

export type MomentRepositoryDocument = {
  schemaVersion: 1;
  updatedAt: string;
  moments: MomentRecord[];
};
