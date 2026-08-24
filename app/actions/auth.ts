"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type AuthState = { errorCode?: string; message?: string } | undefined;

export async function authenticate(_state: AuthState, formData: FormData): Promise<AuthState> {
  const mode = formData.get("mode") === "signUp" ? "signUp" : "signIn";
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

  const supabase = await createClient();

  if (mode === "signUp") {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${process.env.APP_URL ?? "http://localhost:3000"}/auth/confirm` },
    });
    if (error) return { errorCode: error.code ?? "generic" };
    return { message: "confirmEmailSent" };
  }

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { errorCode: error.code ?? "generic" };
  redirect("/boards");
}
