import { Link, Text } from "react-email";
import EmailLayout from "@/components/emails/EmailLayout";

// A real, standard <a> hyperlink as the call to action, not a button —
// deliberately: it reads unambiguously as "click me" the way a plain
// underlined blue link always has, whereas a button-styled block risks
// looking like decoration in an inbox that strips background colors.
export default function ConfirmEmailAddress({ verifyUrl, logoUrl }: { verifyUrl: string; logoUrl: string }) {
  return (
    <EmailLayout previewText="Confirm your email to start receiving downDATA notifications" logoUrl={logoUrl}>
      <Text style={{ fontSize: 15, color: "#1c222b", margin: "0 0 16px" }}>Hi,</Text>
      <Text style={{ fontSize: 15, color: "#1c222b", lineHeight: 1.6, margin: "0 0 20px" }}>
        Someone requested that incident and status updates from downDATA be sent to this address. If that was you,
        confirm it below to start receiving notifications.
      </Text>
      <Text style={{ fontSize: 16, margin: "0 0 20px" }}>
        <Link href={verifyUrl} style={{ color: "#3b82f6", fontWeight: 600, textDecoration: "underline" }}>
          Confirm this email address
        </Link>
      </Text>
      <Text style={{ fontSize: 12, color: "#9ca3af", wordBreak: "break-all", margin: "0 0 20px" }}>
        Or paste this link into your browser: {verifyUrl}
      </Text>
      <Text style={{ fontSize: 13, color: "#6b7280", margin: 0 }}>
        This link expires in 24 hours. If you didn&rsquo;t request this, you can safely ignore this email.
      </Text>
    </EmailLayout>
  );
}
