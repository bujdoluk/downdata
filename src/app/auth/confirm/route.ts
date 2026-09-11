import { NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

// The signup confirmation email link lands here (?token_hash=...&type=signup),
// as does the password-recovery link (?token_hash=...&type=recovery).
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = searchParams.get("next") ?? "/boards";

  if (tokenHash && type) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) {
      // Marks this redirect as coming from a just-verified recovery token, so
      // /reset-password can tell that apart from a signed-in user just
      // navigating there directly (see AGENTS.md) — not a security check,
      // the session itself still is.
      const destination = type === "recovery" ? `${next}?recovered=1` : next;
      return NextResponse.redirect(`${origin}${destination}`);
    }
    if (error.code === "otp_expired") {
      return NextResponse.redirect(`${origin}/login?error=expired`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`);
}
