import { NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = searchParams.get("next") ?? "/boards";

  if (tokenHash && type) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) {
      // Lets /reset-password tell a recovery link from direct navigation. Not a security check.
      const destination = type === "recovery" ? `${next}?recovered=1` : next;
      return NextResponse.redirect(`${origin}${destination}`);
    }
    if (error.code === "otp_expired") {
      return NextResponse.redirect(`${origin}/login?error=expired`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`);
}
