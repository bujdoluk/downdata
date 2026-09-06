export function stripHtml(body: string): string {
  return body.replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]*>/g, "");
}
