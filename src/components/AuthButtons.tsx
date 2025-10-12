"use client";

import { createBrowserClient } from "@supabase/ssr";
import { useState } from "react";
import { Button } from "@/components/ui/button";

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export function AuthButtons() {
  const [loading, setLoading] = useState(false);

  async function signInGoogle() {
    setLoading(true);
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin }
    });
  }

  async function signInMagic() {
    const email = prompt("Your email for the magic link:");
    if (!email) return;
    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin }
    });
    if (error) alert(error.message);
    else alert("Check your inbox for the sign-in link.");
    setLoading(false);
  }

  async function signOut() {
    setLoading(true);
    await supabase.auth.signOut();
    window.location.reload();
  }

  return (
    <div className="flex gap-2">
      <Button onClick={signInGoogle} disabled={loading} size="sm">
        Sign in with Google
      </Button>
      <Button onClick={signInMagic} disabled={loading} size="sm" variant="outline">
        Magic link
      </Button>
      <Button onClick={signOut} disabled={loading} size="sm" variant="ghost">
        Sign out
      </Button>
    </div>
  );
}
