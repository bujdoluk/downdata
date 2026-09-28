import Link from "next/link";

export default function ClosingCta({ heading, ctaLabel, href }: { heading: string; ctaLabel: string; href: string }) {
  return (
    <div className="border-base-300 border-t py-28 text-center">
      <div className="relative mx-auto flex max-w-6xl flex-col items-center gap-7 px-8">
        <h2 className="max-w-md text-3xl font-extrabold tracking-tight text-balance sm:text-4xl">{heading}</h2>
        <Link href={href} className="btn btn-info rounded-full shadow-lg">
          {ctaLabel}
        </Link>
      </div>
    </div>
  );
}
