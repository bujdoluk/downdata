"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { useTranslation } from "react-i18next";
import "@/lib/i18n/i18n";
import { useQuery } from "@tanstack/react-query";
import { fetchJson } from "@/lib/fetchJson";
import { queryKeys } from "@/lib/queryKeys";
import { nowMs, epochMs } from "@/lib/formatTime";
import { formatMinutesShort } from "@/lib/reminderDuration";
import { resolveRuleForService } from "@/features/maintenance/services/resolveReminderRule";
import ScheduleReminderModal from "@/features/maintenance/components/ScheduleReminderModal";
import { BellIcon } from "@/components/icons/NavIcons";
import type { MaintenanceReminderRule } from "@/features/maintenance/types";
import type { IntegrationDefinition } from "@/types/integration";
import type { TrackedMaintenance } from "@/types/service";

// Re-ticks the countdown every 30s, not every second — a "starts in Xd Yh
// Zm" display doesn't need second-level precision, and this app's own
// reminder-scan cadence is 1 minute anyway (see pollMaintenanceReminders.ts),
// so anything tighter than that would be a precision the rest of the
// feature can't back up.
const COUNTDOWN_TICK_MS = 30_000;

function useCountdownParts(scheduledForIso: string) {
  const [remainingMs, setRemainingMs] = useState(() => epochMs(scheduledForIso) - nowMs());
  useEffect(() => {
    const id = setInterval(() => setRemainingMs(epochMs(scheduledForIso) - nowMs()), COUNTDOWN_TICK_MS);
    return () => clearInterval(id);
  }, [scheduledForIso]);

  const totalMinutes = Math.max(0, Math.floor(remainingMs / 60_000));
  return { days: Math.floor(totalMinutes / 1440), hours: Math.floor((totalMinutes % 1440) / 60), minutes: totalMinutes % 60 };
}

// Maintenance-only chrome layered above the shared IncidentDetail, never
// inside it — IncidentDetail.tsx is also rendered by /incidents, which has
// no reminder concept at all. See the grilling session in git history for
// why this stays a separate wrapper instead of a prop on that component.
export default function MaintenanceReminderHeader({ maintenance }: { maintenance: TrackedMaintenance }) {
  const { t } = useTranslation();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const resetRef = useRef<{ reset: () => void } | null>(null);

  const { data: rules } = useQuery({
    queryKey: queryKeys.maintenance.reminderRules(),
    queryFn: () => fetchJson<MaintenanceReminderRule[]>("/api/maintenance-reminders"),
  });
  const { data: integrations } = useQuery({
    queryKey: queryKeys.integrations.list(),
    queryFn: () => fetchJson<IntegrationDefinition[]>("/api/integrations"),
  });

  const coveringRule = resolveRuleForService(rules ?? [], maintenance.service.slug);
  const isScheduled = maintenance.status === "scheduled";
  const { days, hours, minutes } = useCountdownParts(maintenance.scheduled_for);

  return (
    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
      <div className="flex flex-wrap items-center gap-3">
        {isScheduled && (
          <div className="flex items-center gap-1.5">
            <span className="text-base-content/50 text-xs">{t("maintenances.reminder.startsIn")}</span>
            <span className="countdown font-mono text-sm">
              {days > 0 && (
                <>
                  <span style={{ "--value": days } as CSSProperties} aria-live="polite" aria-label={String(days)} />d
                </>
              )}{" "}
              <span style={{ "--value": hours } as CSSProperties} aria-live="polite" aria-label={String(hours)} />h{" "}
              <span style={{ "--value": minutes } as CSSProperties} aria-live="polite" aria-label={String(minutes)} />m
            </span>
          </div>
        )}
        {coveringRule && (
          <span className="badge badge-info badge-sm">
            {t("maintenances.reminder.badge", { duration: formatMinutesShort(coveringRule.minutesBefore) })}
          </span>
        )}
      </div>

      <button
        type="button"
        onClick={() => {
          resetRef.current?.reset();
          dialogRef.current?.showModal();
        }}
        className="btn btn-outline btn-xs gap-1"
      >
        <BellIcon className="h-4 w-4" />
        {coveringRule ? t("maintenances.reminder.edit") : t("maintenances.reminder.schedule")}
      </button>

      <ScheduleReminderModal
        dialogRef={dialogRef}
        resetRef={resetRef}
        serviceSlug={maintenance.service.slug}
        serviceName={maintenance.service.name}
        coveringRule={coveringRule}
        integrations={integrations ?? []}
      />
    </div>
  );
}
