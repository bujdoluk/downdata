import type { LogoComponent } from "@/types/logo";
import GithubLogo from "@/components/service/logos/GithubLogo";
import SupabaseLogo from "@/components/service/logos/SupabaseLogo";
import CloudflareLogo from "@/components/service/logos/CloudflareLogo";
import VercelLogo from "@/components/service/logos/VercelLogo";
import DiscordLogo from "@/components/service/logos/DiscordLogo";
import NpmLogo from "@/components/service/logos/NpmLogo";
import DigitaloceanLogo from "@/components/service/logos/DigitaloceanLogo";
import NetlifyLogo from "@/components/service/logos/NetlifyLogo";
import OpenaiLogo from "@/components/service/logos/OpenaiLogo";
import ZoomLogo from "@/components/service/logos/ZoomLogo";
import DropboxLogo from "@/components/service/logos/DropboxLogo";
import AtlassianLogo from "@/components/service/logos/AtlassianLogo";
import TwilioLogo from "@/components/service/logos/TwilioLogo";
import MongodbLogo from "@/components/service/logos/MongodbLogo";
import DatadogLogo from "@/components/service/logos/DatadogLogo";
import CircleciLogo from "@/components/service/logos/CircleciLogo";
import SentryLogo from "@/components/service/logos/SentryLogo";
import PostmanLogo from "@/components/service/logos/PostmanLogo";
import NewrelicLogo from "@/components/service/logos/NewrelicLogo";
import BitbucketLogo from "@/components/service/logos/BitbucketLogo";
import ElasticLogo from "@/components/service/logos/ElasticLogo";
import SnowflakeLogo from "@/components/service/logos/SnowflakeLogo";
import CockroachdbLogo from "@/components/service/logos/CockroachdbLogo";
import CloudinaryLogo from "@/components/service/logos/CloudinaryLogo";
import BunnyLogo from "@/components/service/logos/BunnyLogo";
import WasabiLogo from "@/components/service/logos/WasabiLogo";
import MailgunLogo from "@/components/service/logos/MailgunLogo";
import BrevoLogo from "@/components/service/logos/BrevoLogo";
import AnthropicLogo from "@/components/service/logos/AnthropicLogo";
import ElevenlabsLogo from "@/components/service/logos/ElevenlabsLogo";
import NotionLogo from "@/components/service/logos/NotionLogo";
import FigmaLogo from "@/components/service/logos/FigmaLogo";
import AirtableLogo from "@/components/service/logos/AirtableLogo";
import WebflowLogo from "@/components/service/logos/WebflowLogo";
import TrelloLogo from "@/components/service/logos/TrelloLogo";
import RenderLogo from "@/components/service/logos/RenderLogo";
import MonogramLogo from "@/components/service/logos/MonogramLogo";

export const SERVICE_LOGOS: Record<string, LogoComponent> = {
  github: GithubLogo,
  supabase: SupabaseLogo,
  cloudflare: CloudflareLogo,
  vercel: VercelLogo,
  discord: DiscordLogo,
  npm: NpmLogo,
  digitalocean: DigitaloceanLogo,
  netlify: NetlifyLogo,
  openai: OpenaiLogo,
  zoom: ZoomLogo,
  dropbox: DropboxLogo,
  atlassian: AtlassianLogo,
  twilio: TwilioLogo,
  mongodb: MongodbLogo,
  datadog: DatadogLogo,
  circleci: CircleciLogo,
  sentry: SentryLogo,
  postman: PostmanLogo,
  newrelic: NewrelicLogo,
  bitbucket: BitbucketLogo,
  elastic: ElasticLogo,
  snowflake: SnowflakeLogo,
  cockroachdb: CockroachdbLogo,
  cloudinary: CloudinaryLogo,
  bunny: BunnyLogo,
  wasabi: WasabiLogo,
  mailgun: MailgunLogo,
  brevo: BrevoLogo,
  anthropic: AnthropicLogo,
  elevenlabs: ElevenlabsLogo,
  notion: NotionLogo,
  figma: FigmaLogo,
  airtable: AirtableLogo,
  webflow: WebflowLogo,
  trello: TrelloLogo,
  render: RenderLogo,
  // No hand-crafted brand logo available for these — original two-letter
  // badges instead (see MonogramLogo's own comment for why).
  launchdarkly: ({ size }) => <MonogramLogo size={size} initials="LD" color="#4F46E5" />,
  confluent: ({ size }) => <MonogramLogo size={size} initials="CF" color="#2563EB" />,
  pinecone: ({ size }) => <MonogramLogo size={size} initials="PN" color="#0D9488" />,
  linode: ({ size }) => <MonogramLogo size={size} initials="LN" color="#16A34A" />,
  sendgrid: ({ size }) => <MonogramLogo size={size} initials="SG" color="#0EA5E9" />,
  klaviyo: ({ size }) => <MonogramLogo size={size} initials="KL" color="#F59E0B" />,
  plivo: ({ size }) => <MonogramLogo size={size} initials="PL" color="#E11D48" />,
  cohere: ({ size }) => <MonogramLogo size={size} initials="CH" color="#9333EA" />,
  stabilityai: ({ size }) => <MonogramLogo size={size} initials="SA" color="#334155" />,
  groq: ({ size }) => <MonogramLogo size={size} initials="GR" color="#EA580C" />,
};
