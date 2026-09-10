import type { CSSProperties } from "react";
import { Link, Text } from "react-email";
import EmailLayout from "@/components/emails/EmailLayout";
import { formatDuration } from "@/lib/formatTime";
import type { ReportInterval, ReportPayload } from "@/features/reports/types";

// Deliberately not localized, matching every other transactional email in
// this app today (ConfirmEmailAddress/IncidentNotification) — emails
// aren't wired into the i18n pipeline anywhere yet, this doesn't extend
// that on its own.
const INTERVAL_LABEL: Record<ReportInterval, string> = { daily: "daily", weekly: "weekly", monthly: "monthly" };

// Local English-only shim over the shared formatDuration (its h/m math
// lives there once, not duplicated here) — this file has no i18next `t`
// to hand it, same reasoning as INTERVAL_LABEL above.
function formatMinutes(totalMinutes: number): string {
  return formatDuration(totalMinutes, (key, { h, m }) => {
    if (key === "history.duration.minutes") return `${m}m`;
    if (key === "history.duration.hours") return `${h}h`;
    return `${h}h ${m}m`;
  });
}

const thStyle: CSSProperties = { padding: "0 4px 6px", fontSize: 11, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.03em", borderBottom: "1px solid #e5e7eb", textAlign: "left" };
const tdStyle: CSSProperties = { padding: "6px 4px", fontSize: 13, borderBottom: "1px solid #f3f4f6" };

// Was a link-only nudge (uptime %, incident count, a "View full report"
// link, nothing per-service) by an earlier deliberate scope call — see
// AGENTS.md's Failure log for why that got reversed back to the full
// per-board/per-service breakdown mirrored from ReportDetail.tsx (the
// page's equivalent table), just inline-styled for email clients instead
// of Tailwind/daisyUI.
export default function ReportReady({
  logoUrl,
  interval,
  periodStart,
  periodEnd,
  payload,
  isTest = false,
  isPlaceholder = false,
}: {
  logoUrl: string;
  interval: ReportInterval;
  periodStart: string;
  periodEnd: string;
  payload: ReportPayload;
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
  const atRiskCount = payload.atRiskServiceSlugs.length;

  // Maintenance moved into its own line in the stat box below (mirroring
  // ReportDetail.tsx's dedicated stat tile) — keywordMatchCount has no
  // tile of its own, so it stays here.
  const secondaryNotes = [payload.keywordMatchCount > 0 && `${payload.keywordMatchCount} keyword match${payload.keywordMatchCount === 1 ? "" : "es"}`].filter((note): note is string =>
    Boolean(note),
  );

  const boardsWithServices = payload.boards.filter((board) => board.services.length > 0);

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

      <table role="presentation" cellPadding={0} cellSpacing={0} style={{ width: "100%", backgroundColor: "#f9fafb", borderRadius: 8, marginBottom: 12 }}>
        <tr>
          <td style={{ padding: "16px 18px" }}>
            <Text style={{ fontSize: 24, fontWeight: 800, color: "#1c222b", margin: "0 0 4px" }}>{payload.overallUptimePercent}%</Text>
            <Text style={{ fontSize: 13, color: "#6b7280", margin: "0 0 12px" }}>overall uptime</Text>
            <Text style={{ fontSize: 14, color: "#374151", margin: 0 }}>
              {payload.newIncidentCount} incident{payload.newIncidentCount === 1 ? "" : "s"}
              {payload.resolvedIncidentCount > 0 && ` · ${payload.resolvedIncidentCount} resolved`}
            </Text>
            {payload.totalDowntimeMinutes > 0 && (
              <Text style={{ fontSize: 14, color: "#374151", margin: "4px 0 0" }}>
                {formatMinutes(payload.totalDowntimeMinutes)} downtime
                {payload.longestOutageMinutes > 0 && ` (longest ${formatMinutes(payload.longestOutageMinutes)})`}
              </Text>
            )}
            {(payload.completedMaintenanceCount > 0 || payload.upcomingMaintenanceCount > 0) && (
              <Text style={{ fontSize: 14, color: "#374151", margin: "4px 0 0" }}>
                {payload.completedMaintenanceCount} maintenance{payload.completedMaintenanceCount === 1 ? "" : "s"} completed
                {payload.upcomingMaintenanceCount > 0 && ` · ${payload.upcomingMaintenanceCount} upcoming`}
              </Text>
            )}
          </td>
        </tr>
      </table>

      {atRiskCount > 0 && (
        <table role="presentation" cellPadding={0} cellSpacing={0} style={{ width: "100%", backgroundColor: "#fef2f2", borderRadius: 8, marginBottom: 12 }}>
          <tr>
            <td style={{ padding: "10px 14px" }}>
              <Text style={{ fontSize: 13, color: "#b91c1c", fontWeight: 700, margin: 0 }}>
                {atRiskCount} service{atRiskCount === 1 ? "" : "s"} need{atRiskCount === 1 ? "s" : ""} attention
              </Text>
            </td>
          </tr>
        </table>
      )}

      {secondaryNotes.length > 0 && <Text style={{ fontSize: 13, color: "#6b7280", margin: "0 0 20px" }}>{secondaryNotes.join(" · ")}</Text>}

      {boardsWithServices.map((board) => (
        <div key={board.boardId}>
          <Text style={{ fontSize: 13, fontWeight: 700, color: "#374151", margin: "0 0 6px" }}>{board.boardName}</Text>
          <table role="presentation" cellPadding={0} cellSpacing={0} style={{ width: "100%", borderCollapse: "collapse", marginBottom: 20 }}>
            <tr>
              <td style={thStyle}>Service</td>
              <td style={{ ...thStyle, textAlign: "right" }}>Incidents</td>
              <td style={{ ...thStyle, textAlign: "right" }}>Maintenance</td>
              <td style={{ ...thStyle, textAlign: "right" }}>Uptime</td>
              <td style={{ ...thStyle, textAlign: "right" }}>Downtime</td>
            </tr>
            {board.services.map((service) => {
              const color = service.atRisk ? "#ef4444" : "#374151";
              return (
                <tr key={service.slug}>
                  <td style={{ ...tdStyle, color }}>
                    {service.name}
                    {payload.newlyTrackedServiceSlugs.includes(service.slug) && (
                      <span style={{ marginLeft: 6, fontSize: 10, fontWeight: 700, color: "#3b82f6", backgroundColor: "#eff6ff", borderRadius: 4, padding: "1px 5px" }}>New</span>
                    )}
                  </td>
                  <td style={{ ...tdStyle, color, textAlign: "right" }}>{service.incidentCount}</td>
                  {/* See ServiceReportEntry.maintenanceCount's own comment —
                      undefined means "not recorded", shown as a dash rather
                      than a fabricated 0. */}
                  <td style={{ ...tdStyle, color, textAlign: "right" }}>{service.maintenanceCount ?? "–"}</td>
                  <td style={{ ...tdStyle, color, textAlign: "right" }}>{service.uptimePercent}%</td>
                  <td style={{ ...tdStyle, color, textAlign: "right" }}>{formatMinutes(service.downtimeMinutes)}</td>
                </tr>
              );
            })}
          </table>
        </div>
      ))}

      <Text style={{ fontSize: 15, margin: 0 }}>
        <Link href={reportUrl} style={{ color: "#3b82f6", fontWeight: 600, textDecoration: "underline" }}>
          View full report
        </Link>
      </Text>
    </EmailLayout>
  );
}
