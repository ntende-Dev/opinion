import "./globals.css";
import Link from "next/link";
import { auth } from "@/auth";
import SignOutButton from "@/app/SignOutButton";

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
        <header className="mb-10 flex items-center justify-between border-b border-[var(--color-line)] pb-4">
          <Link href="/" className="font-ui text-xl font-bold tracking-tight">
            The Opinion Weekly
          </Link>
          <nav className="font-ui text-sm font-medium flex items-center gap-4">
            <Link href="/" className="hover:underline">
              Home
            </Link>
            <Link href="/contact" className="hover:underline">
              Contact
            </Link>
            {isAuthed ? (
              <>
                <Link href="/dashboard" className="hover:underline">
                  Dashboard
                </Link>
                <SignOutButton />
              </>
            ) : (
              <>
                <Link href="/login" className="hover:underline">
                  Login
                </Link>
                <Link href="/signup" className="hover:underline">
                  Sign up
                </Link>
              </>
            )}
          </nav>
        </header>
        <main className="font-body">{children}</main>
      </body>
    </html>
  );
}
