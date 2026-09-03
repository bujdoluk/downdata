import type { Metadata } from "next";
import MvpPage from "@/components/mvp/MvpPage";

export const metadata: Metadata = {
  title: "downDATA — what it does",
};

export default function Page() {
  return <MvpPage />;
}
