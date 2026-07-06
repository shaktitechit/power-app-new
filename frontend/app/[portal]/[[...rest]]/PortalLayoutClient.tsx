"use client";

import { useState, createContext } from "react";
import { Sidebar } from "@/components/portal/layout/sidebar";
import { Header } from "@/components/portal/layout/header";
import { cn } from "@/components/portal/lib/utils";
import { useAppSelector } from "@/store/hooks";
import PresenceBootstrap from "@/components/portal/shared/components/presenceBootstrap";
import { getNavItemsForRole } from "@/components/portal/layout/nav-utils";

export const PortalLayoutContext = createContext<{
  setTitle: (title: string) => void;
  setSubtitle: (subtitle: string) => void;
}>({
  setTitle: () => {},
  setSubtitle: () => {},
});

interface PortalLayoutClientProps {
  children: React.ReactNode;
}

export default function PortalLayoutClient({ children }: PortalLayoutClientProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [title, setTitle] = useState("Dashboard");
  const [subtitle, setSubtitle] = useState("");
  const user = useAppSelector((state) => state.auth.user);

  // Resolve the correct nav items for this user's role
  const navItems = getNavItemsForRole(user?.role);

  return (
    <PortalLayoutContext.Provider value={{ setTitle, setSubtitle }}>
      <div className="min-h-screen bg-background">
        <PresenceBootstrap />
        <Sidebar
          navItems={navItems}
          isCollapsed={isCollapsed}
          isMobileOpen={isMobileOpen}
          onToggle={() => setIsCollapsed(!isCollapsed)}
          onMobileClose={() => setIsMobileOpen(false)}
          userRole={user?.role}
        />
        <div
          className={cn(
            "flex min-h-screen min-w-0 flex-1 flex-col transition-all duration-300",
            "lg:ml-64",
            isCollapsed && "lg:ml-16",
          )}
        >
          <Header
            title={title}
            subtitle={subtitle}
            onMenuClick={() => setIsMobileOpen(true)}
          />
          <main className="min-w-0 flex-1 overflow-x-auto p-4 sm:p-6">
            {children}
          </main>
        </div>
      </div>
    </PortalLayoutContext.Provider>
  );
}
