import type { Metadata } from "next";
import NotFoundContent from "@/components/NotFoundContent";

export const metadata: Metadata = {
  title: "Page not found · downDATA",
};

export default function NotFound() {
  return (
    <main className="bg-base-100 text-base-content flex flex-1 items-center justify-center p-6">
      <NotFoundContent />
    </main>
  );
}
