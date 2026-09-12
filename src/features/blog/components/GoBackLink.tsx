import Link from "next/link";

export default function GoBackLink({ href }: { href: string }) {
  return (
    <Link href={href} className="link link-hover text-base-content/50 hover:text-base-content text-xs font-medium">
      ← Back
    </Link>
  );
}
