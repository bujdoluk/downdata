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

  // ?recovered=1 marks a recovery link; a signed-in user arriving directly belongs on /account instead.
  if (recovered !== "1") {
    redirect("/account");
  }

  return <ResetPasswordForm />;
}
