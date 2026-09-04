import type { CSSProperties } from "react";
import type { Metadata } from "next";
import { cache } from "react";
import "./globals.css";
import Providers from "./providers";
import {
  companyDisplayName,
  companyFaviconSrc,
  DEFAULT_PRIMARY_COLOR,
  DEFAULT_SECONDARY_COLOR,
  foregroundForHex,
  resolveCompanyColors,
  type CompanyBranding,
} from "@/components/portal/lib/companyBranding";

const loadCompanyBranding = cache(async (): Promise<CompanyBranding | null> => {
  const base = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001").replace(
    /\/$/,
    "",
  );
  try {
    const response = await fetch(`${base}/api/v1/companies/branding`, {
      cache: "no-store",
      signal: AbortSignal.timeout(2500),
    });
    if (!response.ok) return null;
    const json = await response.json();
    const data = json?.data;
    if (!data || typeof data !== "object") return null;
    return data as CompanyBranding;
  } catch {
    return null;
  }
});

export async function generateMetadata(): Promise<Metadata> {
  const branding = await loadCompanyBranding();
  const title = companyDisplayName(branding);
  return {
    title,
    description:
      "Enterprise dashboard for managing power infrastructure audits, facilities, and energy systems",
    generator: "v0.app",
    icons: {
      icon: [{ url: companyFaviconSrc(branding) }],
      apple: [{ url: companyFaviconSrc(branding) }],
    },
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const branding = await loadCompanyBranding();
  const colors = resolveCompanyColors(branding);
  const brandStyle = {
    "--company-primary": colors.primary || DEFAULT_PRIMARY_COLOR,
    "--company-primary-foreground": foregroundForHex(
      colors.primary || DEFAULT_PRIMARY_COLOR,
    ),
    "--company-secondary": colors.secondary || DEFAULT_SECONDARY_COLOR,
  } as CSSProperties;

  return (
    <html
      lang="en"
      suppressHydrationWarning
      data-company-branding="true"
      style={brandStyle}
    >
      <body className="font-sans antialiased">
        <Providers initialBranding={branding}>
          {children}
        </Providers>
        {/* <Analytics /> */}
      </body>
    </html>
  );
}
