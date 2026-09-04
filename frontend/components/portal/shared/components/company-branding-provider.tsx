"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  type ReactNode,
} from "react";
import {
  companyDisplayName,
  companyFaviconSrc,
  companyLogoSrc,
  DEFAULT_COMPANY_LOGO,
  DEFAULT_COMPANY_NAME,
  DEFAULT_PRIMARY_COLOR,
  DEFAULT_SECONDARY_COLOR,
  foregroundForHex,
  resolveCompanyColors,
  type CompanyBranding,
} from "@/components/portal/lib/companyBranding";
import { useGetCompanyBrandingQuery } from "@/store/slices/companyApiSlice";

type CompanyBrandingContextValue = {
  displayName: string;
  logoSrc: string;
  faviconSrc: string;
  primaryColor: string;
  secondaryColor: string;
};

const CompanyBrandingContext = createContext<CompanyBrandingContextValue>({
  displayName: DEFAULT_COMPANY_NAME,
  logoSrc: DEFAULT_COMPANY_LOGO,
  faviconSrc: DEFAULT_COMPANY_LOGO,
  primaryColor: DEFAULT_PRIMARY_COLOR,
  secondaryColor: DEFAULT_SECONDARY_COLOR,
});

function applyCompanyTheme(primary: string, secondary: string) {
  const root = document.documentElement;
  root.style.setProperty("--company-primary", primary);
  root.style.setProperty("--company-primary-foreground", foregroundForHex(primary));
  root.style.setProperty("--company-secondary", secondary);
  root.dataset.companyBranding = "true";
}

function applyFavicon(href: string) {
  const selectors = "link[rel='icon'], link[rel='shortcut icon'], link[rel='apple-touch-icon']";
  const links = Array.from(document.querySelectorAll<HTMLLinkElement>(selectors));
  if (links.length === 0) {
    const link = document.createElement("link");
    link.rel = "icon";
    link.href = href;
    document.head.appendChild(link);
    return;
  }
  links.forEach((link) => {
    link.href = href;
  });
}

export function CompanyBrandingProvider({
  children,
  initialBranding,
}: {
  children: ReactNode;
  initialBranding?: CompanyBranding | null;
}) {
  const { data } = useGetCompanyBrandingQuery();
  const branding = (data?.data || initialBranding || {}) as CompanyBranding;
  const colors = resolveCompanyColors(branding);
  const value = useMemo(
    () => ({
      displayName: companyDisplayName(branding),
      logoSrc: companyLogoSrc(branding),
      faviconSrc: companyFaviconSrc(branding),
      primaryColor: colors.primary,
      secondaryColor: colors.secondary,
    }),
    [branding.legal_name, branding.trade_name, branding.logo_url, branding.favicon_url, branding.updated_at, colors.primary, colors.secondary],
  );

  useEffect(() => {
    applyCompanyTheme(value.primaryColor, value.secondaryColor);
    applyFavicon(value.faviconSrc);
  }, [value.faviconSrc, value.primaryColor, value.secondaryColor]);

  return (
    <CompanyBrandingContext.Provider value={value}>
      {children}
    </CompanyBrandingContext.Provider>
  );
}

export function useCompanyBranding() {
  return useContext(CompanyBrandingContext);
}
