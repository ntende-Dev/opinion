import "./globals.scss";
import type { Metadata } from "next";
import { auth } from "@/auth";
import { sectionById } from "@/lib/sections";
import { sectionsInPrint } from "@/lib/stories";
import Providers from "@/app/Providers";
import { Toaster } from "sonner";
import SiteHeader from "@/app/SiteHeader";
import Footer from "@/app/Footer";

const siteUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";

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
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" crossOrigin="" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Literata:wght@400;600;700&family=Outfit:wght@400;500;600&display=swap"
        />
      </head>
      <body className="font-body">
        <Providers>
          <SiteHeader initialAuthed={isAuthed} sections={sections} />
          <main className="font-body">{children}</main>
          <Footer isAuthed={isAuthed} />
        </Providers>
        <Toaster position="top-center" />
      </body>
    </html>
  );
}
