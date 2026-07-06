import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";
import Providers from "./providers";

export const metadata: Metadata = {
  title: "Shakti Powers - Power Infrastructure Audit Management",
  description:
    "Enterprise dashboard for managing power infrastructure audits, facilities, and energy systems",
  generator: "v0.app",
  icons: {
    icon: [
      {
        url: "/spspl-logo.jpeg",
        media: "(prefers-color-scheme: light)",
      },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-sans antialiased">
        <Providers>{children}</Providers>
        {/* <Analytics /> */}
      </body>
    </html>
  );
}
