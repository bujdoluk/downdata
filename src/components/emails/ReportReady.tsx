import { Link, Text } from "react-email";
import EmailLayout from "@/components/emails/EmailLayout";
import type { ReportInterval } from "@/features/reports/types";

// Deliberately not localized, matching every other transactional email in
// this app today (ConfirmEmailAddress/IncidentNotification) — emails
// aren't wired into the i18n pipeline anywhere yet, this doesn't extend
// that on its own.
const INTERVAL_LABEL: Record<ReportInterval, string> = { daily: "daily", weekly: "weekly", monthly: "monthly" };

// Deliberately short — just enough to justify opening /reports, not the
// full breakdown (that lives only on the page). See this feature's
// settled scope: the nudge is the reason to open the app, not a second
// copy of the data.
export default function ReportReady({
  logoUrl,
  interval,
  periodStart,
  periodEnd,
  overallUptimePercent,
  incidentCount,
  atRiskCount,
  isTest = false,
  isPlaceholder = false,
}: {
  logoUrl: string;
  interval: ReportInterval;
  periodStart: string;
  periodEnd: string;
  overallUptimePercent: number;
  incidentCount: number;
  atRiskCount: number;
  // Set by sendTestReportEmail() (reportGeneration.ts) for the /reports
  // "send test email" button — never by the real cron. isPlaceholder is
  // narrower: only true when isTest is *also* true and the account tracks
  // nothing real to show (see buildPlaceholderTestPayload), so the numbers
  // below are fabricated, not just an early preview of real ones.
  isTest?: boolean;
  isPlaceholder?: boolean;
}) {
  const label = INTERVAL_LABEL[interval];
  const reportUrl = new URL("/reports", process.env.APP_URL ?? "https://www.downdata.online").toString();

  return (
    <EmailLayout previewText={isTest ? `[Test] Your ${label} report` : `Your ${label} report is ready`} logoUrl={logoUrl}>
      {isTest && (
        <Text style={{ fontSize: 13, color: "#92400e", backgroundColor: "#fef3c7", borderRadius: 6, padding: "8px 12px", margin: "0 0 16px" }}>
          This is a test email you sent yourself from /reports. No one else received it.
          {isPlaceholder && " The numbers below are example data, not real activity. Connect a board to see your own."}
        </Text>
      )}
      <Text style={{ fontSize: 15, color: "#1c222b", margin: "0 0 16px" }}>Hi,</Text>
      <Text style={{ fontSize: 15, color: "#1c222b", lineHeight: 1.6, margin: "0 0 16px" }}>
        Your {label} report for {periodStart} – {periodEnd} is ready.
      </Text>

      <table role="presentation" cellPadding={0} cellSpacing={0} style={{ width: "100%", backgroundColor: "#f9fafb", borderRadius: 8, marginBottom: 20 }}>
        <tr>
          <td style={{ padding: "16px 18px" }}>
            <Text style={{ fontSize: 24, fontWeight: 800, color: "#1c222b", margin: "0 0 4px" }}>{overallUptimePercent}%</Text>
            <Text style={{ fontSize: 13, color: "#6b7280", margin: "0 0 12px" }}>overall uptime</Text>
            <Text style={{ fontSize: 14, color: "#374151", margin: 0 }}>
              {incidentCount} incident{incidentCount === 1 ? "" : "s"}
              {atRiskCount > 0 && (
                <>
                  {" · "}
                  <span style={{ color: "#ef4444", fontWeight: 700 }}>
                    {atRiskCount} service{atRiskCount === 1 ? "" : "s"} need{atRiskCount === 1 ? "s" : ""} attention
                  </span>
                </>
              )}
            </Text>
          </td>
        </tr>
      </table>

      <Text style={{ fontSize: 15, margin: 0 }}>
        <Link href={reportUrl} style={{ color: "#3b82f6", fontWeight: 600, textDecoration: "underline" }}>
          View full report
        </Link>
      </Text>
    </EmailLayout>
  );
}
