import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const getRoleSlug = (role?: string) => {
  if (role === "super_admin") return "super-admin";
  return role || "";
};

export function middleware(req: NextRequest) {
  const accessToken = req.cookies.get("jwt")?.value;
  const refreshToken = req.cookies.get("refreshToken")?.value;
  const role = req.cookies.get("role")?.value;
  /** Session: short-lived access and/or refresh cookie (client refreshes access via API) */
  const hasSession = Boolean(accessToken || refreshToken);
  const usersHubFlag = req.cookies.get("usersHub")?.value;
  const { pathname } = req.nextUrl;

  // Prevent logged-in user from opening login page
  if (pathname === "/login") {
    if (hasSession) {
      const slug = getRoleSlug(role);
      return NextResponse.redirect(new URL(`/${slug}/dashboard`, req.url));
    }
    return NextResponse.next();
  }

  // Protect private routes
  if (!hasSession) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // Redirect root / to dashboard
  if (pathname === "/") {
    const slug = getRoleSlug(role);
    return NextResponse.redirect(new URL(`/${slug}/dashboard`, req.url));
  }

  const segments = pathname.split("/").filter(Boolean);
  const firstSegment = segments[0];

  const portalSlugs = ["super-admin", "admin", "manager", "auditor"];

  if (portalSlugs.includes(firstSegment)) {
    const portalRole = firstSegment;
    const expectedSlug = getRoleSlug(role);
    if (portalRole !== expectedSlug) {
      return NextResponse.redirect(new URL(`/${expectedSlug}/dashboard`, req.url));
    }

    // Protect features within the portal
    const subPath = segments.slice(1).join("/");
    const canUsersHub = usersHubFlag === "1" || role === "super_admin" || role === "admin";
    const canReportsHub = canUsersHub || role === "manager";
    const canPerformanceHub = role === "super_admin" || role === "admin";

    if (subPath.startsWith("users") && !canUsersHub) {
      return NextResponse.redirect(new URL(`/${portalRole}/dashboard`, req.url));
    }
    if (subPath.startsWith("audits") && !canUsersHub) {
      return NextResponse.redirect(new URL(`/${portalRole}/dashboard`, req.url));
    }
    if (subPath.startsWith("performance") && !canPerformanceHub) {
      return NextResponse.redirect(new URL(`/${portalRole}/dashboard`, req.url));
    }
    if (subPath.startsWith("reports") && !canReportsHub) {
      return NextResponse.redirect(new URL(`/${portalRole}/dashboard`, req.url));
    }
    if (subPath.startsWith("submited-enquiries") && role !== "super_admin") {
      return NextResponse.redirect(new URL(`/${portalRole}/dashboard`, req.url));
    }
    if (subPath.startsWith("pending-quotation") && role !== "super_admin") {
      return NextResponse.redirect(new URL(`/${portalRole}/dashboard`, req.url));
    }
  } else {
    // If it's a known top-level app route or old portal route (like "/portal/admin"), redirect to "/admin/..."
    const rootPaths = [
      "dashboard",
      "facilities",
      "facility",
      "enquiries",
      "submited-enquiries",
      "pending-quotation",
      "settings",
      "reports",
      "audits",
      "users",
      "performance",
      "analytics",
      "profile",
    ];

    const expectedSlug = getRoleSlug(role);
    if (firstSegment === "portal" && segments[1] && portalSlugs.includes(segments[1])) {
      return NextResponse.redirect(
        new URL(`/${expectedSlug}/${segments.slice(2).join("/")}`, req.url)
      );
    } else if (rootPaths.includes(firstSegment)) {
      return NextResponse.redirect(
        new URL(`/${expectedSlug}/${segments.join("/")}`, req.url)
      );
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|spspl-logo.jpeg).*)",
  ],
};
