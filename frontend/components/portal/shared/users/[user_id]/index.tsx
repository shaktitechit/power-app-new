"use client";

import { useParams } from "@/components/portal/hooks/useParams";
import { UserPerformanceContent } from "@/components/portal/shared/components/user-performance/user-performance-content";

export default function UserPerformancePage() {
  const params = useParams();
  const userId = String(params.user_id || "");

  return (
    <UserPerformanceContent
      userId={userId}
      backHref="/users"
      backLabel="Back to Users"
    />
  );
}
