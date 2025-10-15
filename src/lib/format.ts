export function topSkills(skills: string[] | null | undefined, limit = 6): string[] {
  return (skills || []).slice(0, limit);
}

export function formatLocation(loc: string | null | undefined): string {
  return (loc || "").trim();
}