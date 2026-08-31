import type { Metadata } from "next";
import NotFoundContent from "@/components/NotFoundContent";

export const metadata: Metadata = {
  title: "Page not found · downDATA",
};

export default function NotFound() {
  return (
    <main className="flex flex-1 items-center-safe justify-center p-6">
      <NotFoundContent />
    </main>
  );
}
