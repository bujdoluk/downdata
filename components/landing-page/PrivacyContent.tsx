import Footer from "@/components/landing-page/Footer";
import { SUPPORT_EMAIL } from "@/lib/constants";

const lastUpdated = "28 August 2026";

export default function PrivacyContent() {
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <div className="mx-auto w-full max-w-3xl flex-1 px-6 py-12">
        <h1 className="text-3xl font-bold">Privacy Policy</h1>
        <p className="text-base-content/60 mt-2 text-sm">Last updated: {lastUpdated}</p>

        <p className="mt-6">
          downDATA (&ldquo;we&rdquo;, &ldquo;us&rdquo;) lets you track the status of services like
          GitHub, Supabase, Cloudflare, and other Atlassian Statuspage-based providers, group them
          into boards, and get incident history and Slack notifications. This policy explains what
          information we collect when you use downDATA, why, and what choices you have about it.
        </p>

        <h2 className="mt-8 mb-3 text-xl font-bold">1. Information we collect</h2>
        <p>
          <strong>Account information.</strong> When you sign up with email/password or Google, we
          (via our authentication provider, Supabase) store your email address and an encrypted
          password or your Google account identifier.
        </p>
        <p className="mt-3">
          <strong>Tracked services, boards, and integrations.</strong> Which services you choose to
          track, how you group them into boards, and any Slack workspace you connect via
          &ldquo;Add to Slack&rdquo; are stored so we can show your dashboard and, if you&rsquo;ve
          connected Slack, post status notifications to the channel you picked.
        </p>
        <p className="mt-3">
          <strong>Incident history.</strong> For tracked services, we keep a durable history of
          status changes and incidents (polled periodically from each provider&rsquo;s public
          Statuspage feed) so past incidents remain visible even after they&rsquo;re resolved. This
          is public status data about the services you track, not personal data about you.
        </p>
        <p className="mt-3">
          <strong>Support conversations.</strong> If you opt in to live chat (see Cookies below) and
          message us, those conversations are handled by Tawk.to.
        </p>
        <p className="mt-3">
          <strong>Usage data.</strong> If you opt in to analytics (see Cookies below), we collect
          anonymized, aggregate usage data via Vercel Analytics and Speed Insights — page views and
          performance metrics, not the specifics of what you track.
        </p>

        <h2 className="mt-8 mb-3 text-xl font-bold">2. How we use this information</h2>
        <ul className="list-disc space-y-1 pl-6">
          <li>To provide the service — your dashboard, tracked services, boards, and incident history.</li>
          <li>To operate your account — authentication and, where connected, your Slack integration.</li>
          <li>To send the Slack notifications you configured when a tracked service&rsquo;s status changes.</li>
          <li>To protect the service from abuse.</li>
          <li>With your consent, to understand aggregate usage and improve the product, and to provide live chat support.</li>
        </ul>
        <p className="mt-3">We do not sell your personal information, ever.</p>

        <h2 id="cookies" className="mt-8 mb-3 text-xl font-bold">3. Cookies</h2>
        <p>
          We use three categories of cookies/local storage, matching the choices in the &ldquo;Cookie
          preferences&rdquo; link in the footer of this site:
        </p>
        <ul className="mt-3 list-disc space-y-2 pl-6">
          <li>
            <strong>Necessary</strong> — keeps you logged in and protects login forms from bots.
            Always on: the site can&rsquo;t function without these, and GDPR/ePrivacy don&rsquo;t
            require consent for strictly necessary technology.
          </li>
          <li>
            <strong>Analytics</strong> — Vercel Analytics and Speed Insights. Off by default; only
            loads once you opt in.
          </li>
          <li>
            <strong>Support chat</strong> — the Tawk.to live chat widget. Off by default; only loads
            once you opt in.
          </li>
        </ul>
        <p className="mt-3">
          You can change your choice at any time using the &ldquo;Cookie preferences&rdquo; link in
          the footer of any page. Your decision is stored in your browser&rsquo;s local storage, not
          a tracking cookie.
        </p>

        <h2 className="mt-8 mb-3 text-xl font-bold">4. Third-party services we use</h2>
        <ul className="list-disc space-y-1 pl-6">
          <li><strong>Supabase</strong> — authentication and database hosting for your account, tracked services, boards, and incident history.</li>
          <li><strong>Vercel</strong> — hosting, and (opt-in only) analytics and performance monitoring.</li>
          <li><strong>Slack</strong> — optional notification integration, only if you connect a workspace.</li>
          <li><strong>Tawk.to</strong> — live chat support (opt-in only).</li>
          <li>
            <strong>Each tracked service&rsquo;s own status provider</strong> — live status shown on
            downDATA is fetched directly from that service&rsquo;s public Statuspage API, on
            demand; we don&rsquo;t store it beyond the incident history described above.
          </li>
        </ul>
        <p className="mt-3">
          Each of these providers processes data under their own privacy policy, only for the
          purposes described above.
        </p>

        <h2 className="mt-8 mb-3 text-xl font-bold">5. Data retention</h2>
        <p>
          We keep your account, tracked services, boards, and Slack connection for as long as your
          account exists. Incident history is kept for the services being tracked and isn&rsquo;t
          tied to any individual account.
        </p>

        <h2 className="mt-8 mb-3 text-xl font-bold">6. Your rights</h2>
        <p>
          Depending on where you live, you may have the right to access, correct, export, or delete
          your personal information. downDATA doesn&rsquo;t yet have a self-service account page for
          this — contact us at{" "}
          <a href={`mailto:${SUPPORT_EMAIL}`} className="link">
            {SUPPORT_EMAIL}
          </a>{" "}
          and we&rsquo;ll act on your request.
        </p>

        <h2 className="mt-8 mb-3 text-xl font-bold">7. Children&rsquo;s privacy</h2>
        <p>This service is not directed at children under 16, and we don&rsquo;t knowingly collect information from them.</p>

        <h2 className="mt-8 mb-3 text-xl font-bold">8. Changes to this policy</h2>
        <p>
          If we make material changes to this policy, we&rsquo;ll update the &ldquo;Last
          updated&rdquo; date above.
        </p>

        <h2 className="mt-8 mb-3 text-xl font-bold">9. Contact</h2>
        <p>
          Questions about this policy? Email us at{" "}
          <a href={`mailto:${SUPPORT_EMAIL}`} className="link">
            {SUPPORT_EMAIL}
          </a>
          .
        </p>
      </div>
      <Footer />
    </div>
  );
}
