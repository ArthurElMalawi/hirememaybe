import { NextResponse } from "next/server";
import { createClientServer } from "@/lib/supabase/server";
import type { SearchItem } from "@/types/search";

export const runtime = "nodejs";

function parseCsv(value: string | null | undefined): string[] {
  const v = (value || "").trim();
  if (!v) return [];
  return v
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const q = (url.searchParams.get("q") || "").trim() || null;
    const skills = parseCsv(url.searchParams.get("skills"));
    const location = (url.searchParams.get("location") || "").trim() || null;
    const sortParam = (url.searchParams.get("sort") || "relevance").trim();
    const sort = ["relevance", "likes", "recent"].includes(sortParam) ? sortParam : "relevance";
    // New filters v1.6
    const minYearsRaw = (url.searchParams.get("min_years") || "").trim();
    const min_years = minYearsRaw ? Math.max(0, Math.min(50, Number(minYearsRaw))) || 0 : 0;
    const lang_code = (url.searchParams.get("language_code") || "").trim() || null;
    const lang_min_level_raw = (url.searchParams.get("language_min_level") || "").trim().toUpperCase();
    const allowedLevels = ["A1","A2","B1","B2","C1","C2"] as const;
    const lang_min_level = (allowedLevels as readonly string[]).includes(lang_min_level_raw) ? lang_min_level_raw : null;
    const remote_ok = ((url.searchParams.get("remote_ok") || "").trim().toLowerCase()) === "true" ? true : null;
    const relocation_ok = ((url.searchParams.get("relocation_ok") || "").trim().toLowerCase()) === "true" ? true : null;

    const supabase = await createClientServer();
    const { data, error } = await supabase.rpc("search_candidates", {
      q,
      skills,
      p_location: location,
      sort,
      min_years,
      lang_code,
      lang_min_level,
      remote_ok,
      relocation_ok,
    });

    if (!error && Array.isArray(data)) {
      const items: SearchItem[] = (data || []).map((row: Record<string, unknown>) => ({
        id: String(row["id"] ?? ""),
        headline: (row["headline"] as string | null) ?? null,
        location: (row["location"] as string | null) ?? null,
        skills: Array.isArray(row["skills"]) ? ((row["skills"] as unknown[]) as string[]) : [],
        likes_count: Number(row["likes_count"] ?? 0),
        score: Number(row["score"] ?? 0),
        seniority_years: (row["seniority_years"] as number | null) ?? null,
        remote_ok: Boolean(row["remote_ok"] ?? false),
        relocation_ok: Boolean(row["relocation_ok"] ?? false),
        languages: Array.isArray(row["languages"]) ? ((row["languages"] as Array<Record<string, unknown>>).map((l) => ({
          code: String(l["code"] || ""),
          level: String(l["level"] || "").toUpperCase() as "A1" | "A2" | "B1" | "B2" | "C1" | "C2",
        }))) : [],
      }));
      return NextResponse.json({ items }, { status: 200 });
    }

    // Fallback sans RPC: filtre basique + calcul likes_count et score approximatif
    let query = supabase
      .from("candidates")
      .select("id, headline, location, skills, about, created_at, seniority_years, remote_ok, relocation_ok")
      .in("visibility", ["public", "anonymized"]);

    if (q) {
      // Recherche basique sur headline et about
      const like = `%${q}%`;
      query = query.or(`headline.ilike.${like},about.ilike.${like}`);
    }
    if (skills.length) {
      query = query.overlaps("skills", skills);
    }
    if (location) {
      query = query.ilike("location", `%${location}%`);
    }
    // Note: fallback n'inclut pas les nouveaux filtres (langue, années, remote/relocation)
    // Ceux-ci sont gérés côté RPC; en mode fallback on garde une recherche basique.

    const { data: rows } = await query.limit(50);
    const candidates = (rows || []).map((r: Record<string, unknown>) => ({
      id: String(r["id"] ?? ""),
      headline: (r["headline"] as string | null) ?? null,
      location: (r["location"] as string | null) ?? null,
      skills: Array.isArray(r["skills"]) ? ((r["skills"] as unknown[]) as string[]) : [],
      about: (r["about"] as string | null) ?? null,
      created_at: String(r["created_at"] ?? ""),
      seniority_years: (r["seniority_years"] as number | null) ?? null,
      remote_ok: Boolean(r["remote_ok"] ?? false),
      relocation_ok: Boolean(r["relocation_ok"] ?? false),
    }));

    // likes_count par candidat (requêtes unitaires; à remplacer par RPC pour perf)
    const likesMap = new Map<string, number>();
    await Promise.all(
      candidates.map(async (c) => {
        if (!c.id) return;
        const { count } = await supabase
          .from("candidate_likes")
          .select("id", { count: "exact", head: true })
          .eq("candidate_id", c.id);
        likesMap.set(c.id, Number(count ?? 0));
      })
    );

    // Scoring approximatif
    function scoreOf(c: typeof candidates[number]): number {
      let s = 0;
      if (q) {
        const qq = q.toLowerCase();
        const h = (c.headline || "").toLowerCase();
        const a = (c.about || "").toLowerCase();
        if (h.includes(qq)) s += 1.0;
        if (a.includes(qq)) s += 0.6;
      }
      if (skills.length && c.skills.length) {
        const match = c.skills.filter((sk) => skills.includes(sk)).length;
        s += Math.min(0.8, match * 0.2);
      }
      if (location) {
        const loc = (c.location || "").toLowerCase();
        if (loc.includes(location.toLowerCase())) s += 0.2;
      }
      const likes = likesMap.get(c.id) || 0;
      s += Math.min(2, likes * 0.05);
      const completeness = (c.headline ? 1 : 0) + (c.location ? 1 : 0) + (c.skills.length ? 1 : 0) + (c.about ? 1 : 0);
      s += completeness * 0.1;
      return s;
    }

    // Languages per candidate (bulk fetch)
    const ids = candidates.map((c) => c.id).filter(Boolean);
    const langMap = new Map<string, { code: string; level: "A1" | "A2" | "B1" | "B2" | "C1" | "C2" }[]>();
    if (ids.length) {
      const { data: langs } = await supabase
        .from("candidate_languages")
        .select("candidate_id, code, level")
        .in("candidate_id", ids)
        .limit(2000);
      (langs || []).forEach((l: Record<string, unknown>) => {
        const cid = String(l["candidate_id"] || "");
        if (!cid) return;
        const arr = langMap.get(cid) || [];
        arr.push({
          code: String(l["code"] || ""),
          level: String(l["level"] || "").toUpperCase() as "A1" | "A2" | "B1" | "B2" | "C1" | "C2",
        });
        langMap.set(cid, arr);
      });
    }

    let items: SearchItem[] = candidates.map((c) => ({
      id: c.id,
      headline: c.headline,
      location: c.location,
      skills: c.skills,
      likes_count: likesMap.get(c.id) || 0,
      score: scoreOf(c),
      seniority_years: c.seniority_years ?? null,
      remote_ok: c.remote_ok ?? false,
      relocation_ok: c.relocation_ok ?? false,
      languages: langMap.get(c.id) || [],
    }));

    if (sort === "likes") {
      items = items.sort((a, b) => (b.likes_count || 0) - (a.likes_count || 0));
    } else if (sort === "recent") {
      // Sans created_at exposé dans SearchItem, on conserve relevance fallback
      // (Tu peux enrichir le type si nécessaire)
    } else {
      items = items.sort((a, b) => (b.score || 0) - (a.score || 0));
    }

    return NextResponse.json({ items, note: error ? "fallback_no_rpc" : undefined }, { status: 200 });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ items: [], error: msg }, { status: 200 });
  }
}