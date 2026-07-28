/**
 * Ensures file-management links use the Next.js origin (`/api/...` rewrites) so `jwt` is sent.
 * Use for `href` / `src` from the API when DB still has absolute URLs from another host.
 */
export function extractFileManagementFileId(
  storedUrl: string | undefined | null,
): string | null {
  if (storedUrl == null) return null;
  const s = String(storedUrl).trim();
  if (!s) return null;

  const pathMatch = s.match(
    /\/api\/v1\/file-management\/files\/([^/?#]+)\/(?:view|download|content)/i,
  );
  if (pathMatch) return pathMatch[1];

  const absoluteMatch = s.match(
    /file-management\/files\/([^/?#]+)\/(?:view|download|content)/i,
  );
  if (absoluteMatch) return absoluteMatch[1];

  return null;
}

export function toSameOriginFileManagementUrl(
  storedUrl: string | undefined | null,
): string {
  if (storedUrl == null) return "";
  const s = String(storedUrl).trim();
  if (!s) return "";
  if (s.startsWith("/api/v1/file-management/")) return s;
  const m = s.match(
    /(\/api\/v1\/file-management\/files\/[^/]+\/(?:view|download|content))(?:\?[^\s#]*)?/i,
  );
  if (m) return m[1];
  return s;
}

/** Authenticated proxy that streams file bytes through the backend (no MinIO redirect). */
export function toFileManagementContentUrl(
  storedUrl: string | undefined | null,
): string {
  const fileId = extractFileManagementFileId(storedUrl);
  if (fileId) {
    return `/api/v1/file-management/files/${fileId}/content`;
  }
  return toSameOriginFileManagementUrl(storedUrl);
}

export function toAbsoluteFileManagementContentUrl(
  storedUrl: string | undefined | null,
): string {
  const path = toFileManagementContentUrl(storedUrl);
  if (!path) return "";
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  if (typeof window === "undefined") return path;
  const origin = window.location.origin.replace(/\/$/, "");
  return `${origin}${path.startsWith("/") ? path : `/${path}`}`;
}

export async function fetchFileManagementAsDataUrl(
  storedUrl: string | undefined | null,
): Promise<string | null> {
  const absolute = toAbsoluteFileManagementContentUrl(storedUrl);
  if (!absolute) return null;

  try {
    const res = await fetch(absolute, { credentials: "include", cache: "no-store" });
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}
