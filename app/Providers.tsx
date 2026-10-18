"use client";
import { SessionProvider } from "next-auth/react";

/**
 * Client bridge for next-auth's SessionProvider. Importing `next-auth/react`
 * directly into the server root layout is not reliably recognized as a client
 * component under Turbopack, which crashes every route with
 * "React Context is unavailable in Server Components".
 */
export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider refetchOnWindowFocus={false}>
      {children}
    </SessionProvider>
  );
}
