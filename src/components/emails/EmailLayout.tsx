import { Body, Container, Head, Hr, Html, Img, Preview, Section, Text } from "react-email";
import type { ReactNode } from "react";

// Shared branded wrapper for every transactional email this app sends
// (confirmation + incident notifications) — header (logo + wordmark),
// content slot, footer. Kept in shared components/, not owned by one
// feature: the confirmation email belongs to features/integrations, but
// the incident notification email is sent from lib/notifyIncidentEvents.ts
// (system-level, no single feature owner), so both need this from a
// shared location.
//
// Rendered server-side to a static HTML string via @react-email/render
// (see the two call sites) and never mounted in this app's own React
// tree — it targets third-party email clients, not a browser, hence the
// table-friendly react-email primitives and fully inline styles instead
// of Tailwind/daisyUI classes, which no email client applies.
export default function EmailLayout({ previewText, logoUrl, children }: { previewText: string; logoUrl: string; children: ReactNode }) {
  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={{ backgroundColor: "#eef1f5", fontFamily: "-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica, Arial, sans-serif", margin: 0, padding: "32px 16px" }}>
        <Container style={{ backgroundColor: "#ffffff", borderRadius: 12, padding: 32, maxWidth: 480, margin: "0 auto" }}>
          <Section>
            <table role="presentation" cellPadding={0} cellSpacing={0}>
              <tr>
                <td style={{ verticalAlign: "middle", paddingRight: 10 }}>
                  <Img src={logoUrl} width={28} height={28} alt="downDATA" />
                </td>
                <td style={{ verticalAlign: "middle" }}>
                  <Text style={{ fontSize: 20, fontWeight: 800, letterSpacing: "-0.02em", margin: 0, lineHeight: 1 }}>
                    <span style={{ color: "#ef4444" }}>down</span>
                    <span style={{ color: "#1c222b" }}>DATA</span>
                  </Text>
                </td>
              </tr>
            </table>
          </Section>

          <Section style={{ marginTop: 24 }}>{children}</Section>

          <Hr style={{ borderColor: "#e5e7eb", margin: "32px 0 16px" }} />
          <Text style={{ fontSize: 12, color: "#6b7280", margin: 0, lineHeight: 1.6 }}>
            downDATA. Status monitoring for the services you depend on.
            <br />
            www.downdata.online
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
