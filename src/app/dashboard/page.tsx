import { createClientServer } from "@/lib/supabase/server";
import Link from "next/link";

export const runtime = "nodejs";

export default async function DashboardPage() {
  const supabase = await createClientServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-semibold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Sign in to view insights.</p>
        <Link href="/" className="underline text-sm">Go home</Link>
      </div>
    );
  }

  const { data: candidate } = await supabase
    .from("candidates")
    .select("id, headline")
    .eq("user_id", user.id)
    .single();

  if (!candidate) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-semibold">Dashboard</h1>
        <p className="text-sm">No candidate profile found.</p>
        <Link href="/dashboard/profile" className="underline text-sm">Create your profile</Link>
      </div>
    );
  }

  const { count: likesCount } = await supabase
    .from("candidate_likes")
    .select("id", { count: "exact", head: true })
    .eq("candidate_id", candidate.id);

  const { count: viewsCount } = await supabase
    .from("candidate_views")
    .select("id", { count: "exact", head: true })
    .eq("candidate_id", candidate.id);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Dashboard</h1>
      <p className="text-sm text-muted-foreground">{candidate.headline}</p>
      <div className="grid grid-cols-2 gap-4">
        <div className="border rounded p-4">
          <div className="text-sm text-muted-foreground">Likes</div>
          <div className="text-2xl font-semibold">{likesCount || 0}</div>
        </div>
        <div className="border rounded p-4">
          <div className="text-sm text-muted-foreground">Views</div>
          <div className="text-2xl font-semibold">{viewsCount || 0}</div>
        </div>
      </div>
      <div className="text-sm">
        <Link href={`/c/${candidate.id}`} className="underline">View your public profile</Link>
      </div>
    </div>
  );
}
