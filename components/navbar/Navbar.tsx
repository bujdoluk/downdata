import { getAllServices } from "@/lib/services";
import NavbarClient from "@/components/navbar/NavbarClient";

export default function Navbar() {
  const services = getAllServices();
  return <NavbarClient services={services} />;
}
