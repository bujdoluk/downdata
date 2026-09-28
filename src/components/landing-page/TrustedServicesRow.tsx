"use client";

import { useTranslation } from "react-i18next";
import "@/lib/i18n/i18n";
import { SERVICE_LOGOS } from "@/components/logos";
import RevealOnScroll from "@/components/landing-page/RevealOnScroll";

// Real marks only, no MonogramLogo fallbacks. Not a "trusted by" claim; it's "what you can track".
const TRACKABLE_SERVICES = [
  { slug: "github", name: "GitHub" },
  { slug: "cloudflare", name: "Cloudflare" },
  { slug: "supabase", name: "Supabase" },
  { slug: "vercel", name: "Vercel" },
  { slug: "openai", name: "OpenAI" },
  { slug: "anthropic", name: "Anthropic" },
  { slug: "mongodb", name: "MongoDB" },
  { slug: "datadog", name: "Datadog" },
  { slug: "notion", name: "Notion" },
  { slug: "figma", name: "Figma" },
  { slug: "discord", name: "Discord" },
  { slug: "npm", name: "npm" },
  { slug: "digitalocean", name: "DigitalOcean" },
  { slug: "netlify", name: "Netlify" },
  { slug: "dropbox", name: "Dropbox" },
  { slug: "atlassian", name: "Atlassian" },
  { slug: "twilio", name: "Twilio" },
  { slug: "circleci", name: "CircleCI" },
  { slug: "sentry", name: "Sentry" },
  { slug: "postman", name: "Postman" },
  { slug: "newrelic", name: "New Relic" },
  { slug: "bitbucket", name: "Bitbucket" },
  { slug: "elastic", name: "Elastic" },
  { slug: "snowflake", name: "Snowflake" },
  { slug: "cockroachdb", name: "CockroachDB" },
  { slug: "cloudinary", name: "Cloudinary" },
  { slug: "bunny", name: "Bunny" },
  { slug: "wasabi", name: "Wasabi" },
  { slug: "mailgun", name: "Mailgun" },
  { slug: "brevo", name: "Brevo" },
  { slug: "elevenlabs", name: "ElevenLabs" },
  { slug: "airtable", name: "Airtable" },
  { slug: "webflow", name: "Webflow" },
  { slug: "trello", name: "Trello" },
  { slug: "render", name: "Render" },
  { slug: "zoom", name: "Zoom" },
] as const;

export default function TrustedServicesRow() {
  const { t } = useTranslation();

  return (
    <section className="border-base-300 border-t py-16">
      <div className="mx-auto max-w-6xl px-8">
        <p className="text-base-content/50 mb-8 text-center text-sm font-medium">{t("landing.trusted.heading")}</p>
        <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-6">
          {TRACKABLE_SERVICES.map(({ slug, name }, i) => {
            const Logo = SERVICE_LOGOS[slug];
            if (!Logo) return null;
            return (
              <RevealOnScroll key={slug} delayMs={(i % 12) * 30}>
                <div
                  title={name}
                  role="img"
                  aria-label={name}
                  className="text-base-content relative transition-transform duration-300 hover:z-10 hover:scale-125 motion-reduce:transition-none motion-reduce:hover:scale-100"
                >
                  <Logo size={28} name={name} />
                </div>
              </RevealOnScroll>
            );
          })}
        </div>
      </div>
    </section>
  );
}
