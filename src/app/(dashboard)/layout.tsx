import Sidebar from "@/components/sidebar/Sidebar";
import NavigationLoadingBoundary from "@/components/NavigationLoadingBoundary";
import { isAdminUser } from "@/features/blog/services/requireAdminUser";

export default async function DashboardLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const isAdmin = await isAdminUser();
  return <NavigationLoadingBoundary sidebar={<Sidebar isAdmin={isAdmin} />}>{children}</NavigationLoadingBoundary>;
}
