import { Body, Container, Head, Hr, Html, Img, Preview, Section, Text } from "react-email";
import type { ReactNode } from "react";

// Rendered to static HTML for email clients, hence inline styles instead of Tailwind/daisyUI.
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
