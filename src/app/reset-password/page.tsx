import type { Metadata } from "next";
import { redirect } from "next/navigation";
import ResetPasswordForm from "@/features/auth/components/ResetPasswordForm";

export const metadata: Metadata = {
  title: "Reset password · downDATA",
};

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ recovered?: string }>;
}) {
  const { recovered } = await searchParams;

  // Reaching this page at all already implies a session (proxy.ts gates
  // everything else behind login) — the ?recovered=1 marker is what tells a
  // just-verified recovery link apart from a signed-in user who navigated
  // here directly, who should land on /account's password section instead.
  if (recovered !== "1") {
    redirect("/account");
  }

  return <ResetPasswordForm />;
}
