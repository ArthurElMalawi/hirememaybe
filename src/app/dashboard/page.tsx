import { createClientServer } from "@/lib/supabase/server";
import Link from "next/link";
import ReceivedRequestsTable from "@/components/contact/ReceivedRequestsTable";
import { ToasterProvider } from "@/components/ui/toaster";

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

  // Demandes de contact reçues par le candidat
  const { data: reqRows } = await supabase
    .from("contact_requests")
    .select("id, requester_id, message, created_at, status")
    .eq("candidate_id", candidate.id)
    .order("created_at", { ascending: false })
    .limit(100);

  const requesterIds = Array.from(new Set((reqRows || []).map((r: Record<string, unknown>) => String(r["requester_id"] || "")).filter((s) => s.length > 0)));
  const recruitersMap = new Map<string, { company?: string | null; role?: string | null }>();
  if (requesterIds.length) {
    const { data: recruiters } = await supabase
      .from("recruiters")
      .select("user_id, company, role")
      .in("user_id", requesterIds);
    (recruiters || []).forEach((r: Record<string, unknown>) => {
      recruitersMap.set(String(r["user_id"] || ""), { company: (r["company"] as string | null) ?? null, role: (r["role"] as string | null) ?? null });
    });
  }

  const received = (reqRows || []).map((r: Record<string, unknown>) => {
    const rid = String(r["requester_id"] || "");
    const info = recruitersMap.get(rid) || {};
    return {
      id: String(r["id"] || ""),
      company: info.company ?? null,
      role: info.role ?? null,
      message: (r["message"] as string | null) ?? null,
      created_at: (r["created_at"] as string | null) ?? null,
      status: String(r["status"] || "pending") as "pending" | "approved" | "declined" | "canceled",
    };
  }).filter((x) => x.id.length > 0);

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
      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Demandes reçues</h2>
        <ToasterProvider>
          <ReceivedRequestsTable items={received} />
        </ToasterProvider>
      </div>
    </div>
  );
}
