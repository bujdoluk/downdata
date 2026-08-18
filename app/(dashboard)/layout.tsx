import NavbarClient from "@/components/navbar/NavbarClient";
import Sidebar from "@/components/sidebar/Sidebar";

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <NavbarClient />
      <div className="flex flex-1">
        <Sidebar />
        {children}
      </div>
    </>
  );
}
