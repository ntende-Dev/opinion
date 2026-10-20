import "./globals.scss";
import type { Metadata, Viewport } from "next";
import { Literata, Outfit } from "next/font/google";
import { auth } from "@/auth";
import { sectionById } from "@/lib/sections";
import { sectionsInPrint } from "@/lib/stories";
import Providers from "@/app/Providers";
import { Toaster } from "sonner";
import SiteHeader from "@/app/SiteHeader";
import Footer from "@/app/Footer";
import CookieConsent from "@/app/CookieConsent";

const siteUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";

/**
 * The paper's two faces, self-hosted by next/font: served from our own domain
 * (no third-party request, no render-blocking stylesheet) and preloaded with
 * `display: swap` plus a metric-matched fallback, so the swap does not shift
 * the page. The CSS variables below are what globals.scss reads.
 */
const literata = Literata({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-literata",
});

const outfit = Outfit({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-outfit",
});

export const viewport: Viewport = {
  // Ties the browser chrome to each theme (globals.scss paints both).
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0b0c10" },
  ],
  colorScheme: "light dark",
};

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "The Opinion Weekly",
    template: "%s — The Opinion Weekly",
  },
  description: "Where every opinion matters. A journal of editorial argument.",
  openGraph: {
    type: "website",
    siteName: "The Opinion Weekly",
    title: "The Opinion Weekly",
    description: "Where every opinion matters. A journal of editorial argument.",
    url: siteUrl,
  },
  alternates: {
    types: { "application/rss+xml": "/feed.xml" },
  },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  const isAuthed = !!session;

  // The masthead's section row: only the desks with something published, so
  // no link in it lands a reader on an empty page.
  const sections = (await sectionsInPrint()).flatMap((id) => {
    const section = sectionById(id);
    return section ? [{ id: section.id, name: section.name }] : [];
  });

  return (
    <html lang="en" className={`${literata.variable} ${outfit.variable}`}>
      <body className="font-body">
        {/* Keyboard readers reach the story without walking the masthead. */}
        <a href="#main" className="skip-link">
          Skip to content
        </a>
        <Providers>
          <SiteHeader initialAuthed={isAuthed} sections={sections} />
          <main id="main" tabIndex={-1} className="font-body">
            {children}
          </main>
          <Footer isAuthed={isAuthed} />
        </Providers>
        {/* The consent bar sits last so keyboard readers meet it after the
            page's content, and its buttons are ordinary tab stops. */}
        <CookieConsent />
        <Toaster position="top-center" />
      </body>
    </html>
  );
}
