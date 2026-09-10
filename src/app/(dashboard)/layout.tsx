import Sidebar from "@/components/sidebar/Sidebar";
import NavigationLoadingBoundary from "@/components/NavigationLoadingBoundary";

export default function DashboardLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <NavigationLoadingBoundary sidebar={<Sidebar />}>{children}</NavigationLoadingBoundary>;
}
