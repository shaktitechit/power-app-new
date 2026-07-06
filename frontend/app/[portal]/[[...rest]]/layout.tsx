import PortalLayoutClient from "./PortalLayoutClient";

export default function Layout({ children }: { children: React.ReactNode }) {
  return <PortalLayoutClient>{children}</PortalLayoutClient>;
}
