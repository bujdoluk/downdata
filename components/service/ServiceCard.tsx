import Link from "next/link";
import type { ServiceSlug } from "@/lib/services";
import { SERVICE_LOGOS } from "@/components/service/logos";
import FallbackLogo from "@/components/service/logos/FallbackLogo";
import { INDICATOR_STYLES, FALLBACK_STYLE, type Indicator } from "@/components/service/statusStyles";

// Purely presentational — status data is fetched once, in bulk, by
// ServiceGrid and passed down. This card owns no fetch/timer of its own.
type ServiceCardProps = {
  slug: ServiceSlug;
  name: string;
  indicator?: Indicator;
  description?: string;
  isLoading: boolean;
  error: boolean;
};

export default function ServiceCard({ slug, name, indicator, description, isLoading, error }: ServiceCardProps) {
  const style = indicator ? INDICATOR_STYLES[indicator] : undefined;
  const Logo = SERVICE_LOGOS[slug] ?? FallbackLogo;

  return (
    <Link
      href={`/service/${slug}`}
      className="block w-full max-w-xs border border-black/10 bg-black/5 p-3 shadow-xl backdrop-blur transition-colors hover:border-black/20 hover:bg-black/10 dark:border-white/10 dark:bg-white/5 dark:hover:border-white/20 dark:hover:bg-white/10"
    >
      <div className="flex items-center gap-3 text-neutral-900 dark:text-white">
        <Logo size={28} name={name} />
        <h1 className="text-base font-semibold">{name}</h1>
      </div>

      <div className="mt-3 flex items-center gap-2.5">
        <span
          className={`h-2 w-2 shrink-0 rounded-full ${
            isLoading
              ? "animate-pulse bg-black/20 dark:bg-white/30"
              : error
                ? "bg-black/20 dark:bg-white/30"
                : (style ?? FALLBACK_STYLE).dot
          }`}
        />
        <p
          className={`text-xs font-medium ${
            error || isLoading ? "text-neutral-500 dark:text-white/50" : (style ?? FALLBACK_STYLE).text
          }`}
        >
          {isLoading
            ? "Checking status…"
            : error
              ? "Unable to reach status API"
              : description}
        </p>
      </div>
    </Link>
  );
}
