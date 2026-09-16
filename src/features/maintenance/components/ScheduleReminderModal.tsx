"use client";

import { useImperativeHandle, useState, type RefObject } from "react";
import { useTranslation } from "react-i18next";
import "@/lib/i18n/i18n";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { requestJson } from "@/lib/fetchJson";
import { queryKeys } from "@/lib/queryKeys";
import { bestFitDuration, toMinutes, type DurationUnit } from "@/lib/reminderDuration";
import ModalCloseButton from "@/components/ModalCloseButton";
import SelectDropdown from "@/components/SelectDropdown";
import Spinner from "@/components/Spinner";
import type { IntegrationDefinition } from "@/types/integration";
import type { MaintenanceReminderRule, ReminderChannel } from "@/features/maintenance/types";

const CHANNELS: ReminderChannel[] = ["slack", "email", "sms"];
const PRESET_MINUTES = [15, 30, 60, 120, 1440, 2880, 10080, 20160] as const;
const PRESET_KEYS = ["min15", "min30", "hour1", "hour2", "day1", "day2", "week1", "week2"] as const;
const DURATION_UNITS: DurationUnit[] = ["minutes", "hours", "days", "weeks"];

function isChannelAvailable(channel: ReminderChannel, integrations: IntegrationDefinition[]): boolean {
  const integration = integrations.find((candidate) => candidate.slug === channel);
  if (!integration) return false;
  if (integration.slug === "slack") return true;
  if (integration.slug === "webhook") return false; // not a reminder channel — ReminderChannel never includes it
  return integration.recipients.some((recipient) => recipient.verified);
}

function computeInitialState(coveringRule: MaintenanceReminderRule | null, integrations: IntegrationDefinition[]) {
  const minutes = coveringRule?.minutesBefore;
  const isKnownPreset = minutes !== undefined && (PRESET_MINUTES as readonly number[]).includes(minutes);
  const bestFit = minutes !== undefined ? bestFitDuration(minutes) : { value: 1, unit: "days" as DurationUnit };
  return {
    scope: (coveringRule?.serviceSlug === null ? "all" : "service") as "service" | "all",
    preset: minutes === undefined ? "1440" : isKnownPreset ? String(minutes) : "custom",
    customValue: String(bestFit.value),
    customUnit: bestFit.unit,
    // Defaults to whichever channels are actually deliverable right now,
    // not a hardcoded "slack" — an account with zero connected
    // integrations would otherwise get a rule pre-selected on a channel
    // that's visibly disabled (and can never fire) while canSave (which
    // only checks channels.size > 0) stayed none the wiser. An empty
    // default here correctly leaves canSave blocked until the user
    // connects something real.
    channels: new Set<ReminderChannel>(coveringRule?.channels ?? CHANNELS.filter((channel) => isChannelAvailable(channel, integrations))),
  };
}

export default function ScheduleReminderModal({
  dialogRef,
  resetRef,
  serviceSlug,
  serviceName,
  coveringRule,
  integrations,
}: {
  dialogRef: RefObject<HTMLDialogElement | null>;
  resetRef: RefObject<{ reset: () => void } | null>;
  serviceSlug: string;
  serviceName: string;
  coveringRule: MaintenanceReminderRule | null;
  integrations: IntegrationDefinition[];
}) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const [scope, setScope] = useState(() => computeInitialState(coveringRule, integrations).scope);
  const [preset, setPreset] = useState(() => computeInitialState(coveringRule, integrations).preset);
  const [customValue, setCustomValue] = useState(() => computeInitialState(coveringRule, integrations).customValue);
  const [customUnit, setCustomUnit] = useState(() => computeInitialState(coveringRule, integrations).customUnit);
  const [channels, setChannels] = useState(() => computeInitialState(coveringRule, integrations).channels);
  const [error, setError] = useState<string | null>(null);

  useImperativeHandle(
    resetRef,
    () => ({
      reset: () => {
        const initial = computeInitialState(coveringRule, integrations);
        setScope(initial.scope);
        setPreset(initial.preset);
        setCustomValue(initial.customValue);
        setCustomUnit(initial.customUnit);
        setChannels(initial.channels);
        setError(null);
      },
    }),
    [coveringRule, integrations],
  );

  const parsedCustomValue = Number(customValue);
  const customValid = Number.isInteger(parsedCustomValue) && parsedCustomValue > 0;
  const minutesBefore = preset === "custom" ? (customValid ? toMinutes(parsedCustomValue, customUnit) : null) : Number(preset);

  function toggleChannel(channel: ReminderChannel) {
    setChannels((current) => {
      const next = new Set(current);
      if (next.has(channel)) next.delete(channel);
      else next.add(channel);
      return next;
    });
  }

  const saveMutation = useMutation({
    mutationFn: async () => {
      const saved = await requestJson<MaintenanceReminderRule>("/api/maintenance-reminders", t("maintenances.reminder.saveFailed"), {
        method: "PUT",
        body: { serviceSlug: scope === "all" ? null : serviceSlug, minutesBefore, channels: [...channels] },
      });
      // Switching scope to "all" from a rule that was genuinely this
      // service's own (not an inherited "all" rule shown here because it
      // covers this service too) leaves the old per-service row behind —
      // it's now shadowed by the new "all" rule under
      // resolveRuleForService's most-specific-wins, but never deleted, so
      // it'd keep counting as "this service has its own rule" forever.
      // Only ever deletes a rule scoped to *this* service — never the
      // inherited "all" rule itself, or this would wipe every other
      // service's reminder too.
      if (scope === "all" && coveringRule && coveringRule.serviceSlug === serviceSlug) {
        await requestJson(`/api/maintenance-reminders?id=${coveringRule.id}`, t("maintenances.reminder.saveFailed"), { method: "DELETE" });
      }
      return saved;
    },
    onSuccess: () => {
      setError(null);
      queryClient.invalidateQueries({ queryKey: queryKeys.maintenance.reminderRules() });
      dialogRef.current?.close();
    },
    onError: (err: Error) => setError(err.message),
  });

  const removeMutation = useMutation({
    mutationFn: () => {
      if (!coveringRule) throw new Error(t("maintenances.reminder.saveFailed"));
      return requestJson<{ removed: boolean }>(`/api/maintenance-reminders?id=${coveringRule.id}`, t("maintenances.reminder.removeFailed"), {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      setError(null);
      queryClient.invalidateQueries({ queryKey: queryKeys.maintenance.reminderRules() });
      dialogRef.current?.close();
    },
    onError: (err: Error) => setError(err.message),
  });

  const canSave = minutesBefore !== null && channels.size > 0;

  return (
    <dialog ref={dialogRef} className="modal">
      <div className="modal-box relative">
        <ModalCloseButton />
        <h3 className="text-lg font-bold">{t("maintenances.reminder.modalTitle")}</h3>

        <div className="mt-4 flex flex-col gap-4">
          <fieldset className="fieldset py-0">
            <legend className="fieldset-legend">{t("maintenances.reminder.leadTimeLabel")}</legend>
            <SelectDropdown
              value={preset}
              options={[
                ...PRESET_MINUTES.map((minutes, i) => ({
                  value: String(minutes),
                  label: t(`maintenances.reminder.presets.${PRESET_KEYS[i]}`),
                })),
                { value: "custom", label: t("maintenances.reminder.presets.custom") },
              ]}
              onChange={setPreset}
              ariaLabel={t("maintenances.reminder.leadTimeLabel")}
              className="w-48"
            />
            {preset === "custom" && (
              <div className="mt-2 flex items-center gap-2">
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={customValue}
                  onChange={(e) => setCustomValue(e.target.value)}
                  className="input input-bordered input-sm w-20"
                />
                <SelectDropdown
                  value={customUnit}
                  options={DURATION_UNITS.map((unit) => ({ value: unit, label: t(`maintenances.reminder.unit.${unit}`) }))}
                  onChange={setCustomUnit}
                  ariaLabel={t("maintenances.reminder.unitLabel")}
                  className="w-32"
                />
              </div>
            )}
            <p className="text-base-content/50 mt-1 text-xs">{t("maintenances.reminder.leadTimeHint")}</p>
          </fieldset>

          <fieldset className="fieldset py-0">
            <legend className="fieldset-legend">{t("maintenances.reminder.scopeLabel")}</legend>
            <div className="flex flex-col gap-1">
              <label className="label cursor-pointer justify-start gap-2 text-sm">
                <input
                  type="radio"
                  name="reminder-scope"
                  className="radio radio-sm"
                  checked={scope === "service"}
                  onChange={() => setScope("service")}
                />
                {t("maintenances.reminder.scopeService", { name: serviceName })}
              </label>
              <label className="label cursor-pointer justify-start gap-2 text-sm">
                <input
                  type="radio"
                  name="reminder-scope"
                  className="radio radio-sm"
                  checked={scope === "all"}
                  onChange={() => setScope("all")}
                />
                {t("maintenances.reminder.scopeAll")}
              </label>
            </div>
            {scope === "all" && <p className="text-warning mt-1 text-xs">{t("maintenances.reminder.scopeAllNotice")}</p>}
          </fieldset>

          <fieldset className="fieldset py-0">
            <legend className="fieldset-legend">{t("maintenances.reminder.channelsLabel")}</legend>
            <div className="flex flex-col gap-1">
              {CHANNELS.map((channel) => {
                const available = isChannelAvailable(channel, integrations);
                return (
                  <label key={channel} className={`label cursor-pointer justify-start gap-2 text-sm ${available ? "" : "opacity-50"}`}>
                    <input
                      type="checkbox"
                      className="checkbox checkbox-sm"
                      checked={channels.has(channel)}
                      disabled={!available}
                      onChange={() => toggleChannel(channel)}
                    />
                    {t(`maintenances.reminder.channel.${channel}`)}
                    {!available && <span className="text-base-content/50 text-xs">{t("maintenances.reminder.channelUnavailable")}</span>}
                  </label>
                );
              })}
            </div>
          </fieldset>

          {error && (
            <p role="alert" className="text-error text-xs break-words">
              {error}
            </p>
          )}

          <div className="flex items-center justify-between gap-2">
            {coveringRule ? (
              <button
                type="button"
                disabled={removeMutation.isPending}
                onClick={() => removeMutation.mutate()}
                className="btn btn-error btn-outline btn-sm"
              >
                {removeMutation.isPending ? <Spinner size="xs" /> : t("maintenances.reminder.remove")}
              </button>
            ) : (
              <span />
            )}
            <button
              type="button"
              disabled={!canSave || saveMutation.isPending}
              onClick={() => saveMutation.mutate()}
              className="btn btn-info btn-sm"
            >
              {saveMutation.isPending ? <Spinner size="xs" /> : t("maintenances.reminder.save")}
            </button>
          </div>
        </div>
      </div>
    </dialog>
  );
}
