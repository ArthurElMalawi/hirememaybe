import { createClientAction } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

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
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );

    revalidatePath("/dashboard/profile");
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Edit your profile</h1>
      <form action={saveProfile} className="space-y-4">
        <div>
          <label className="block text-sm mb-1">Headline *</label>
          <Input name="headline" required />
        </div>
        <div>
          <label className="block text-sm mb-1">Location</label>
          <Input name="location" />
        </div>
        <div>
          <label className="block text-sm mb-1">About</label>
          <Textarea name="about" rows={4} />
        </div>
        <div>
          <label className="block text-sm mb-1">Skills (comma separated)</label>
          <Input name="skills" placeholder="react,ts,scss" />
        </div>
        <fieldset>
          <legend className="text-sm mb-1">Visibility</legend>
          <div className="flex gap-4 text-sm">
            <label className="flex items-center gap-2">
              <input type="radio" name="visibility" value="public" defaultChecked />
              Public
            </label>
            <label className="flex items-center gap-2">
              <input type="radio" name="visibility" value="anonymized" />
              Anonymized
            </label>
            <label className="flex items-center gap-2">
              <input type="radio" name="visibility" value="private" />
              Private
            </label>
          </div>
        </fieldset>
        <div>
          <label className="block text-sm mb-1">Upload CV (PDF)</label>
          <Input type="file" name="cv" accept="application/pdf" />
        </div>
        <Button type="submit">Save profile</Button>
      </form>
    </div>
  );
}