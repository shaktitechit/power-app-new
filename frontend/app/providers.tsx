"use client";

import { Provider } from "react-redux";
import { store } from "@/store/store";
import { ReactNode } from "react";
import { ThemeProvider } from "@/components/portal/shared/components/theme-provider";
import { CompanyBrandingProvider } from "@/components/portal/shared/components/company-branding-provider";
import { Toaster } from "@/components/portal/ui/sonner";
import { FontScaleProvider } from "@/components/portal/shared/components/font-scale-provider";
import type { CompanyBranding } from "@/components/portal/lib/companyBranding";

interface ProvidersProps {
  children: ReactNode;
  initialBranding?: CompanyBranding | null;
}

export default function Providers({ children, initialBranding }: ProvidersProps) {
  return (
    <Provider store={store}>
      <FontScaleProvider>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <CompanyBrandingProvider initialBranding={initialBranding}>
            {children}
            <Toaster position="top-right" richColors closeButton duration={3000} />
          </CompanyBrandingProvider>
        </ThemeProvider>
      </FontScaleProvider>
    </Provider>
  );
}
