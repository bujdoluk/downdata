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
};
