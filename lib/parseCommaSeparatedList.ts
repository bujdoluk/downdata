// Shared by the email/sms connect forms — same "one or more values,
// comma separated" input shape for both recipient emails and phones.
export function parseCommaSeparatedList(raw: string): string[] {
  return raw
    .split(",")
    .map((value) => value.trim())
    .filter((value) => value.length > 0);
}
