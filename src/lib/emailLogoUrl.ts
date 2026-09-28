// Built from APP_URL, not the request host: email clients fetch it later from the recipient's device.
export function emailLogoUrl(): string {
  return new URL("/email-logo.png", process.env.APP_URL ?? "https://www.downdata.online").toString();
}
