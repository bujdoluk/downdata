import Sidebar from "@/components/sidebar/Sidebar";
import NavigationLoadingBoundary from "@/components/NavigationLoadingBoundary";
import { isAdminUser } from "@/features/blog/services/requireAdminUser";

// Checked once here, server-side, and passed straight down — Sidebar is a
// client component and requireAdminUser's session check needs next/
// headers's cookies(), so this is the one place it can run without a
// dedicated client-callable API route just for this single boolean.
export default async function DashboardLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const isAdmin = await isAdminUser();
  return <NavigationLoadingBoundary sidebar={<Sidebar isAdmin={isAdmin} />}>{children}</NavigationLoadingBoundary>;
}
