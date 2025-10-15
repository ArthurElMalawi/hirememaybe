export type SearchItem = {
  id: string;
  headline: string | null;
  location: string | null;
  skills: string[];
  likes_count: number;
  score: number;
  seniority_years?: number | null;
  remote_ok?: boolean;
  relocation_ok?: boolean;
  languages?: { code: string; level: "A1" | "A2" | "B1" | "B2" | "C1" | "C2" }[];
};