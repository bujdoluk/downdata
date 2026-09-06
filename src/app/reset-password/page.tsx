import type { Metadata } from "next";
import ResetPasswordForm from "@/features/auth/components/ResetPasswordForm";

export const metadata: Metadata = {
  title: "Reset password · downDATA",
};

export default function ResetPasswordPage() {
  return <ResetPasswordForm />;
}
