import { createClientAction, createClientServer } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import CandidateProfileForm from "@/components/profile/CandidateProfileForm";

export default async function ProfilePage() {
  async function saveProfile(formData: FormData) {
    "use server";
    const supabase = await createClientAction();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) redirect("/");

    const headline = String(formData.get("headline") || "").trim();
    const location = String(formData.get("location") || "").trim();
    const about = String(formData.get("about") || "").trim();
    const visibility = String(formData.get("visibility") || "public");
    const skillsRaw = String(formData.get("skills") || "");
    const skills = skillsRaw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const remote_ok = String(formData.get("remote_ok") || "false").toLowerCase() === "true";
    const relocation_ok = String(formData.get("relocation_ok") || "false").toLowerCase() === "true";
    const experiencesJson = String(formData.get("experiences_json") || "[]");
    const studiesJson = String(formData.get("studies_json") || "[]");
    const languagesJson = String(formData.get("languages_json") || "[]");

    let cv_path: string | null = null;
    const file = formData.get("cv") as File | null;
    if (file && file.size > 0) {
      const ext = file.name.split(".").pop() || "pdf";
      const path = `${user.id}/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("cvs")
        .upload(path, file, {
          contentType: file.type || "application/pdf",
          upsert: true,
        });
      if (!uploadError) cv_path = path;
    }

    await supabase.from("candidates").upsert(
      {
        user_id: user.id,
        headline,
        location,
        about,
        skills,
        visibility,
        cv_path,
        remote_ok,
        relocation_ok,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );

    // Ensure we have candidate_id to upsert related arrays
    const { data: me } = await supabase
      .from("candidates")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();
    const candidate_id = (me as { id?: string } | null)?.id;

    // Parse arrays (minimal validation)
    let experiences: Array<{ title: string; company: string; start: string; end: string | null; skills: string[] }> = [];
    let studies: Array<{ school: string; degree: string; start: string; end: string | null }> = [];
    let languages: Array<{ code: string; level: "A1"|"A2"|"B1"|"B2"|"C1"|"C2" }> = [];
    try { experiences = JSON.parse(experiencesJson); } catch {}
    try { studies = JSON.parse(studiesJson); } catch {}
    try { languages = JSON.parse(languagesJson); } catch {}

    if (candidate_id) {
      // Experiences: replace-all strategy
      await supabase.from("candidate_experiences").delete().eq("candidate_id", candidate_id);
      const expRows = (experiences || [])
        .map((e) => ({
          candidate_id,
          title: String(e.title || "").trim(),
          company: String(e.company || "").trim(),
          start: String(e.start || "").trim(),
          end: e.end ? String(e.end).trim() : null,
          skills: Array.isArray(e.skills) ? e.skills.map((s) => String(s).trim()).filter(Boolean) : [],
        }))
        .filter((x) => x.title && x.start);
      if (expRows.length) {
        await supabase.from("candidate_experiences").insert(expRows);
      }

      // Studies: replace-all strategy
      await supabase.from("candidate_studies").delete().eq("candidate_id", candidate_id);
      const eduRows = (studies || [])
        .map((e) => ({
          candidate_id,
          school: String(e.school || "").trim(),
          degree: String(e.degree || "").trim(),
          start: String(e.start || "").trim(),
          end: e.end ? String(e.end).trim() : null,
        }))
        .filter((x) => x.school && x.start);
      if (eduRows.length) {
        await supabase.from("candidate_studies").insert(eduRows);
      }

      // Languages: replace-all strategy
      await supabase.from("candidate_languages").delete().eq("candidate_id", candidate_id);
      const allowed = ["fr","en","es","de","it","pt","ar","zh","ja","ko"];
      const lvlAllowed = ["A1","A2","B1","B2","C1","C2"];
      const langRows = (languages || [])
        .map((l) => ({
          candidate_id,
          code: String(l.code || "").trim(),
          level: String(l.level || "").trim().toUpperCase(),
        }))
        .filter((x) => allowed.includes(x.code) && lvlAllowed.includes(x.level));
      if (langRows.length) {
        await supabase.from("candidate_languages").insert(langRows);
      }
    }

    revalidatePath("/dashboard/profile");
  }

  // Précharger données existantes pour initialiser la forme et afficher seniority_years
  const supa = await createClientServer();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) redirect("/");
  const { data: candidate } = await supa
    .from("candidates")
    .select("id, headline, location, about, skills, visibility, cv_path, seniority_years, remote_ok, relocation_ok")
    .eq("user_id", user.id)
    .maybeSingle();
  const candidateId = (candidate as Record<string, unknown> | null)?.["id"] as string | undefined;
  const { data: expRows } = candidateId
    ? await supa.from("candidate_experiences").select("title, company, start, end, skills").eq("candidate_id", candidateId).order("start", { ascending: false }).limit(50)
    : { data: [] };
  const { data: eduRows } = candidateId
    ? await supa.from("candidate_studies").select("school, degree, start, end").eq("candidate_id", candidateId).order("start", { ascending: false }).limit(50)
    : { data: [] };
  const { data: langRows } = candidateId
    ? await supa.from("candidate_languages").select("code, level").eq("candidate_id", candidateId).limit(50)
    : { data: [] };

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Éditer mon profil</h1>
      {candidate?.seniority_years !== undefined && candidate?.seniority_years !== null && (
        <p className="text-sm text-muted-foreground">Années d’expérience: {String(candidate.seniority_years)}</p>
      )}
      <form action={saveProfile} className="space-y-4">
        <div>
          <label className="block text-sm mb-1">Headline *</label>
          <Input name="headline" required defaultValue={(candidate as Record<string, unknown> | null)?.["headline"] as string | undefined} />
        </div>
        <div>
          <label className="block text-sm mb-1">Location</label>
          <Input name="location" defaultValue={(candidate as Record<string, unknown> | null)?.["location"] as string | undefined} />
        </div>
        <div>
          <label className="block text-sm mb-1">About</label>
          <Textarea name="about" rows={4} defaultValue={(candidate as Record<string, unknown> | null)?.["about"] as string | undefined} />
        </div>
        <div>
          <label className="block text-sm mb-1">Skills (comma separated)</label>
          <Input name="skills" placeholder="react,ts,scss" defaultValue={((candidate as Record<string, unknown> | null)?.["skills"] as string[] | undefined)?.join(", ") || ""} />
        </div>
        <fieldset>
          <legend className="text-sm mb-1">Visibility</legend>
          <div className="flex gap-4 text-sm">
            <label className="flex items-center gap-2">
              <input type="radio" name="visibility" value="public" defaultChecked={String((candidate as Record<string, unknown> | null)?.["visibility"] || "public") === "public"} />
              Public
            </label>
            <label className="flex items-center gap-2">
              <input type="radio" name="visibility" value="anonymized" defaultChecked={String((candidate as Record<string, unknown> | null)?.["visibility"] || "public") === "anonymized"} />
              Anonymized
            </label>
            <label className="flex items-center gap-2">
              <input type="radio" name="visibility" value="private" defaultChecked={String((candidate as Record<string, unknown> | null)?.["visibility"] || "public") === "private"} />
              Private
            </label>
          </div>
        </fieldset>
        <div>
          <label className="block text-sm mb-1">Upload CV (PDF)</label>
          <Input type="file" name="cv" accept="application/pdf" />
        </div>

        <CandidateProfileForm
          initialExperiences={((expRows || []) as Array<Record<string, unknown>>).map((r) => ({
            title: String(r["title"] || ""),
            company: String(r["company"] || ""),
            start: String(r["start"] || ""),
            end: (r["end"] !== undefined && r["end"] !== null) ? String(r["end"]) : null,
            skills: Array.isArray(r["skills"]) ? (r["skills"] as string[]) : [],
          }))}
          initialStudies={((eduRows || []) as Array<Record<string, unknown>>).map((r) => ({
            school: String(r["school"] || ""),
            degree: String(r["degree"] || ""),
            start: String(r["start"] || ""),
            end: (r["end"] !== undefined && r["end"] !== null) ? String(r["end"]) : null,
          }))}
          initialLanguages={((langRows || []) as Array<Record<string, unknown>>).map((r) => ({
            code: String(r["code"] || ""),
            level: String(r["level"] || "").toUpperCase() as "A1" | "A2" | "B1" | "B2" | "C1" | "C2",
          }))}
          initialRemoteOk={Boolean((candidate as Record<string, unknown> | null)?.["remote_ok"] || false)}
          initialRelocationOk={Boolean((candidate as Record<string, unknown> | null)?.["relocation_ok"] || false)}
          seniorityYears={(candidate as Record<string, unknown> | null)?.["seniority_years"] as number | undefined}
        />

        <Button type="submit">Sauvegarder</Button>
      </form>
    </div>
  );
}