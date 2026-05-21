import type { Metadata } from "next";
import "./globals.css";
import { AnalyticsProvider } from "@/components/posthog-provider";
import { SiteHeader } from "@/components/organisms/site-header";
import { SiteFooter } from "@/components/organisms/site-footer";
import { SaaSMakerFeedback } from "@/components/saasmaker-feedback";

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  ),
  title: {
    default: "EverythingRated — multi-axis ratings for the things devs use",
    template: "%s — EverythingRated",
  },
  description:
    "One stars-out-of-five hides everything that matters. EverythingRated scores every tool across the axes that actually decide the trade-off — pick a directory and dig in.",
  applicationName: "EverythingRated",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: "EverythingRated",
    title: "EverythingRated — multi-axis ratings for the things devs use",
    description:
      "Every tool scored across the axes that actually decide the trade-off — not a single star.",
    url: "/",
  },
  twitter: {
    card: "summary_large_image",
    title: "EverythingRated — multi-axis ratings for the things devs use",
    description:
      "Every tool scored across the axes that actually decide the trade-off — not a single star.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-[var(--background)] text-[var(--foreground)]">
        <AnalyticsProvider>
          <SiteHeader />
          <main className="flex-1">{children}</main>
          <SiteFooter />
          <SaaSMakerFeedback />
        </AnalyticsProvider>
        {/*
          Cloudflare Web Analytics — only injected when a real beacon token is
          configured via NEXT_PUBLIC_CF_BEACON_TOKEN. A placeholder token loads
          a broken beacon, so we omit the script entirely until one is set.
        */}
        {process.env.NEXT_PUBLIC_CF_BEACON_TOKEN ? (
          <script
            defer
            src="https://static.cloudflareinsights.com/beacon.min.js"
            data-cf-beacon={JSON.stringify({
              token: process.env.NEXT_PUBLIC_CF_BEACON_TOKEN,
            })}
          />
        ) : null}
      </body>
    </html>
  );
}
