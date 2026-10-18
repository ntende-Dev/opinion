import "./globals.css";
import { auth } from "@/auth";
import Providers from "@/app/Providers";
import { Toaster } from "sonner";
import SiteHeader from "@/app/SiteHeader";

export const metadata = {
  title: "The Opinion Weekly",
  description: "Where every opinion matters.",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  const isAuthed = !!session;

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
          <SiteHeader initialAuthed={isAuthed} />
          <main className="font-body">{children}</main>
        </Providers>
        <Toaster position="top-center" />
      </body>
    </html>
  );
}
