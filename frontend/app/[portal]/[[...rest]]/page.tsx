"use client";

import { useParams, notFound } from "next/navigation";

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

  switch (portal) {
    case "super-admin":
      return renderSuperAdmin(pathSegments);
    case "admin":
      return renderAdmin(pathSegments);
    case "manager":
      return renderManager(pathSegments);
    case "auditor":
      return renderAuditor(pathSegments);
    default:
      notFound();
  }
}
