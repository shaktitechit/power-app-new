"use client";

import { useParams, notFound } from "next/navigation";
import { useAppSelector } from "@/store/hooks";

// Each portal owns its own routing logic — see components/portal/[role]/router.tsx
import { render as renderSuperAdmin } from "@/components/portal/super-admin/router";
import { render as renderAdmin } from "@/components/portal/admin/router";
import { render as renderManager } from "@/components/portal/manager/router";
import { render as renderAuditor } from "@/components/portal/auditor/router";

export default function Page() {
  const params = useParams();
  const portal = params?.portal as string;
  const rest = params?.rest as string[] | undefined;
  const pathSegments = rest || [];

  const user = useAppSelector((s) => s.auth.user);

  if (portal === "super-admin") return renderSuperAdmin(pathSegments);
  if (portal === "admin") return renderAdmin(pathSegments);
  if (portal === "manager") return renderManager(pathSegments);
  if (portal === "auditor") return renderAuditor(pathSegments);

  // If URL is not prefixed with role (e.g. /work-planner/123), resolve via user's logged-in role
  if (user?.role) {
    const effectiveSegments = [portal, ...pathSegments];
    if (user.role === "super_admin") return renderSuperAdmin(effectiveSegments);
    if (user.role === "admin") return renderAdmin(effectiveSegments);
    if (user.role === "manager") return renderManager(effectiveSegments);
    if (user.role === "auditor") return renderAuditor(effectiveSegments);
  }

  notFound();
}
