// One-off local preview helper — bundles the TSX email templates with
// esbuild (already a transitive dep via react-email) so they can be
// rendered outside Next's own build pipeline, then writes static .html
// files for visual review. Not part of the app itself; not wired into
// package.json scripts.
import { build } from "esbuild";
import { render } from "@react-email/render";
import { writeFileSync, mkdirSync, readFileSync } from "node:fs";

mkdirSync("scratch-email-preview", { recursive: true });

const entryContents = `
import ConfirmEmailAddress from "../src/components/emails/ConfirmEmailAddress.tsx";
import IncidentNotification from "../src/components/emails/IncidentNotification.tsx";
export { ConfirmEmailAddress, IncidentNotification };
`;
writeFileSync("scratch-email-preview/entry.tsx", entryContents);

await build({
  entryPoints: ["scratch-email-preview/entry.tsx"],
  bundle: true,
  platform: "node",
  format: "esm",
  jsx: "automatic",
  outfile: "scratch-email-preview/bundle.mjs",
  external: ["react", "react-dom", "react-email"],
  alias: { "@": "./src" },
});

const { ConfirmEmailAddress, IncidentNotification } = await import("../scratch-email-preview/bundle.mjs");

// Data URI, preview-only — the real send uses the real hosted URL
// (emailLogoUrl()), which isn't live until this branch is deployed, so a
// preview rendered against it would just show a broken image.
const logoUrl = `data:image/png;base64,${readFileSync("public/email-logo.png").toString("base64")}`;

const confirmHtml = await render(ConfirmEmailAddress({ verifyUrl: "https://www.downdata.online/api/integrations/email/verify?token=8279a800-bc6b-4fcb-a7bd-d4dc9df955e9", logoUrl }));
writeFileSync("scratch-email-preview/confirm-email.html", confirmHtml);

const incidentCreatedHtml = await render(
  IncidentNotification({
    logoUrl,
    serviceSlug: "github",
    incidentName: "Elevated error rates on Actions",
    impact: "major",
    status: "investigating",
    body: null,
    shortlink: "https://www.githubstatus.com/incidents/abc123",
    isNew: true,
  }),
);
writeFileSync("scratch-email-preview/incident-created.html", incidentCreatedHtml);

const incidentUpdateHtml = await render(
  IncidentNotification({
    logoUrl,
    serviceSlug: "github",
    incidentName: "Elevated error rates on Actions",
    impact: "major",
    status: "resolved",
    body: "This incident has been resolved. All systems are operating normally.",
    shortlink: "https://www.githubstatus.com/incidents/abc123",
    isNew: false,
  }),
);
writeFileSync("scratch-email-preview/incident-update.html", incidentUpdateHtml);

console.log("Rendered previews to scratch-email-preview/*.html");
