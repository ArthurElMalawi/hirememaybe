import { createClientServer } from "@/lib/supabase/server";
export const runtime = "nodejs";

export default async function TestPage() {
  const supabase = await createClientServer();
  const { data, error } = await supabase.from("candidates").select("*").limit(1);

  if (error) return <pre>{JSON.stringify(error, null, 2)}</pre>;
  return <pre>{JSON.stringify(data, null, 2)}</pre>;
}
