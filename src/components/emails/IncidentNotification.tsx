import { Link, Text } from "react-email";
import EmailLayout from "@/components/emails/EmailLayout";

// Same 4 colors as the app's own status bars (Logo.tsx/icon.svg) and
// INDICATOR_STYLES — kept as a small local map rather than importing
// statusStyles.ts directly, since that file's classNames are daisyUI/
// Tailwind utility classes no email client applies; this needs literal
// hex values inlined instead.
const IMPACT_COLORS: Record<string, string> = {
  none: "#10b981",
  minor: "#eab308",
  major: "#f97316",
  critical: "#ef4444",
};

export default function IncidentNotification({
  logoUrl,
  serviceSlug,
  incidentName,
  impact,
  status,
  body,
  shortlink,
  isNew,
}: {
  logoUrl: string;
  serviceSlug: string;
  incidentName: string;
  impact: string;
  status: string;
  body: string | null;
  shortlink: string | null;
  isNew: boolean;
}) {
  const impactColor = IMPACT_COLORS[impact] ?? "#6b7280";
  const previewText = isNew ? `New incident on ${serviceSlug}: ${incidentName}` : `Update on ${incidentName} (${serviceSlug})`;

  return (
    <EmailLayout previewText={previewText} logoUrl={logoUrl}>
      <Text style={{ fontSize: 15, color: "#1c222b", margin: "0 0 16px" }}>Hi,</Text>
      <Text style={{ fontSize: 15, color: "#1c222b", lineHeight: 1.6, margin: "0 0 16px" }}>
        {isNew ? (
          <>
            A new incident was just reported on <strong>{serviceSlug}</strong>.
          </>
        ) : (
          <>
            There&rsquo;s an update on an incident affecting <strong>{serviceSlug}</strong>.
          </>
        )}
      </Text>

      <table role="presentation" cellPadding={0} cellSpacing={0} style={{ width: "100%", backgroundColor: "#f9fafb", borderRadius: 8, marginBottom: 20 }}>
        <tr>
          <td style={{ padding: "16px 18px" }}>
            <Text style={{ fontSize: 16, fontWeight: 700, color: "#1c222b", margin: "0 0 6px" }}>{incidentName}</Text>
            <Text style={{ fontSize: 13, margin: "0 0 10px" }}>
              <span style={{ color: impactColor, fontWeight: 700, textTransform: "capitalize" }}>{impact}</span>
              <span style={{ color: "#9ca3af" }}> · {status}</span>
            </Text>
            {body && <Text style={{ fontSize: 14, color: "#374151", lineHeight: 1.6, margin: 0 }}>{body}</Text>}
          </td>
        </tr>
      </table>

      {shortlink && (
        <Text style={{ fontSize: 15, margin: 0 }}>
          <Link href={shortlink} style={{ color: "#3b82f6", fontWeight: 600, textDecoration: "underline" }}>
            View this incident
          </Link>
        </Text>
      )}
    </EmailLayout>
  );
}
