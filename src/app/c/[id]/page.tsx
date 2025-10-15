import { createClientServer, createClientAction } from "@/lib/supabase/server";
import ViewTracker from "./ViewTracker";
import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { Button } from "@/components/ui/button";
import LikeButtonApi from "@/components/LikeButtonApi";
import { toggleFavorite as toggleFavoriteServer } from "@/app/actions/toggle-favorite";
import ContactRequestButton from "@/components/contact/ContactRequestButton";
import { ToasterProvider } from "@/components/ui/toaster";
export const runtime = "nodejs";

export default async function CandidatePage({ params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClientServer();
  const { id } = await params;
  const { data: candidate } = await supabase
    .from("candidates")
    .select("id, user_id, headline, location, about, skills, visibility, cv_path, seniority_years, remote_ok, relocation_ok")
    .eq("id", id)
    .single();
  if (!candidate) notFound();

  const { data: { user } } = await supabase.auth.getUser();
  if (candidate.visibility === "private" && (!user || user.id !== candidate.user_id)) {
    notFound();
  }

  const cvPath = candidate?.cv_path ?? null;
  const candidateId = String(candidate?.id || "");
  const { data: langRows } = await supabase
    .from("candidate_languages")
    .select("code, level")
    .eq("candidate_id", candidateId)
    .limit(50);
  async function getCv() {
    "use server";
    const supabase = await createClientAction();
    if (!cvPath) return;
    const { data } = await supabase.storage.from("cvs").createSignedUrl(cvPath, 60);
    if (data?.signedUrl) redirect(data.signedUrl);
  }

  

  let initialLiked = false;
  if (user) {
    const { data: likedRow } = await supabase
      .from("candidate_likes")
      .select("id")
      .eq("candidate_id", candidate.id)
      .eq("user_id", user.id)
      .limit(1);
    initialLiked = (likedRow || []).length > 0;
  }

  const { count: likesCount } = await supabase
    .from("candidate_likes")
    .select("id", { count: "exact", head: true })
    .eq("candidate_id", candidate.id);

  // Initial favorite state
  let initialFavorited = false;
  if (user && candidateId) {
    const { data: favRow } = await supabase
      .from("favorites")
      .select("id")
      .eq("candidate_id", candidateId)
      .eq("user_id", user.id)
      .limit(1);
    initialFavorited = (favRow || []).length > 0;
  }

  async function toggleFavorite() {
    "use server";
    if (!candidateId) return;
    await toggleFavoriteServer(candidateId);
    revalidatePath(`/c/${candidateId}`);
  }

  // Recruiter context (company required)
  let isRecruiter = false;
  let hasCompany = false;
  if (user) {
    const { data: recruiterRow } = await supabase
      .from("recruiters")
      .select("company")
      .eq("user_id", user.id)
      .maybeSingle();
    isRecruiter = !!recruiterRow;
    hasCompany = Boolean((recruiterRow as Record<string, unknown> | null)?.["company"] || "");
  }

  // Existing contact request between current user (recruiter) and this candidate
  type RequestStatus = "pending" | "approved" | "declined" | "canceled";
  type ExistingRequest = { id: string; status: RequestStatus; created_at?: string | null };
  let existingRequest: ExistingRequest | null = null;
  if (user && candidateId) {
    const { data: reqRows } = await supabase
      .from("contact_requests")
      .select("id, status, created_at")
      .eq("candidate_id", candidateId)
      .eq("requester_id", user.id)
      .limit(1);
    const row = (reqRows || [])[0] as Record<string, unknown> | undefined;
    if (row) {
      const rawStatus = String(row["status"] ?? "pending");
      const status = (['pending','approved','declined','canceled'] as const).includes(rawStatus as RequestStatus)
        ? (rawStatus as RequestStatus)
        : "pending";
      existingRequest = {
        id: String(row["id"] ?? ""),
        status,
        created_at: row["created_at"] !== undefined && row["created_at"] !== null ? String(row["created_at"]) : null,
      };
    }
  }

  const isSelf = !!(user && user.id === candidate.user_id);

  return (
    <div className="space-y-6">
      {candidateId && <ViewTracker candidateId={candidateId} />}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold">{candidate.headline}</h1>
          <p className="text-sm text-muted-foreground">
            {candidate.location}
            {candidate.seniority_years !== undefined && candidate.seniority_years !== null && (
              <span className="ml-2">· {String(candidate.seniority_years)} ans d’expérience</span>
            )}
            {candidate.remote_ok && <span className="ml-2">· Remote OK</span>}
            {candidate.relocation_ok && <span className="ml-2">· Relocation OK</span>}
          </p>
        </div>
        <form action={getCv}>
          <Button type="submit" variant="outline" disabled={!cvPath}>Get CV</Button>
        </form>
      </div>
      {candidate.about && <p className="text-sm whitespace-pre-wrap">{candidate.about}</p>}
      <div className="flex flex-wrap gap-2">
        {(candidate.skills || []).map((s: string) => (
          <span key={s} className="text-xs border rounded px-2 py-0.5">{s}</span>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        {(langRows || []).map((l: Record<string, unknown>) => (
          <span key={`${String(l["code"])}-${String(l["level"])}`} className="text-xs border rounded px-2 py-0.5">
            {displayLang(String(l["code"]))} {String(l["level"]).toUpperCase()}
          </span>
        ))}
      </div>
      <ToasterProvider>
        <div className="flex items-center gap-3">
          {candidateId && <LikeButtonApi liked={initialLiked} candidateId={candidateId} />}
          <span className="text-sm text-muted-foreground">{likesCount || 0} likes</span>
          {candidateId && (
            <form action={toggleFavorite}>
              <Button type="submit" variant="secondary">
                {initialFavorited ? "Remove favorite" : "Add to favorites"}
              </Button>
            </form>
          )}
          {candidateId && (
            <ContactRequestButton
              candidateId={candidateId}
              isRecruiter={isRecruiter}
              hasCompany={hasCompany}
              isSelf={isSelf}
              existingRequest={existingRequest}
            />
          )}
        </div>
      </ToasterProvider>
    </div>
  );
}

function displayLang(code: string): string {
  const map: Record<string, string> = {
    fr: "Français",
    en: "English",
    es: "Español",
    de: "Deutsch",
    it: "Italiano",
    pt: "Português",
    ar: "العربية",
    zh: "中文",
    ja: "日本語",
    ko: "한국어",
  };
  return map[code] || code;
}