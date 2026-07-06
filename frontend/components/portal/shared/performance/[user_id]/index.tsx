"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useParams } from "@/components/portal/hooks/useParams";
import { UserPerformanceContent } from "@/components/portal/shared/components/user-performance/user-performance-content";
import { useAppSelector } from "@/store/hooks";
import { canAccessPerformanceHub, type AppUserRole } from "@/components/portal/lib/authRoles";

const ADMIN_PERFORMANCE_ALLOWED: AppUserRole[] = ["manager", "auditor"];

export default function AdminUserPerformancePage() {
  const params = useParams();
  const router = useRouter();
  const userId = String(params.user_id || "");
  const currentRole = useAppSelector((state) => state.auth.user?.role);

  useEffect(() => {
    if (currentRole && !canAccessPerformanceHub(currentRole)) {
      router.replace("/dashboard");
    }
  }, [currentRole, router]);

  if (currentRole && !canAccessPerformanceHub(currentRole)) {
    return null;
  }

  return (
    <UserPerformanceContent
      userId={userId}
      backHref="/performance"
      backLabel="Back to Performance"
      showDownloadPdf
      allowedRoles={
        currentRole === "admin" ? ADMIN_PERFORMANCE_ALLOWED : undefined
      }
    />
  );
}
