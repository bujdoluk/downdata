async function sendOne(url: string, authHeader: string, from: string, to: string, body: string): Promise<boolean> {
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { Authorization: authHeader, "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ To: to, From: from, Body: body }),
      signal: AbortSignal.timeout(8_000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

// A partial failure retries the whole list next cycle: duplicates over silent drops.
export async function sendSms({ to, body }: { to: string[]; body: string }): Promise<boolean> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_FROM_NUMBER;
  if (!accountSid || !authToken || !from) {
    throw new Error("TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_FROM_NUMBER must be set.");
  }

  const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
  const authHeader = `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`;

  const results = await Promise.all(to.map((number) => sendOne(url, authHeader, from, number, body)));
  return results.every(Boolean);
}
