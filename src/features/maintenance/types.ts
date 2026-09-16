export type ReminderChannel = "slack" | "email" | "sms";

export type MaintenanceReminderRule = {
  id: string;
  serviceSlug: string | null;
  minutesBefore: number;
  channels: ReminderChannel[];
};
