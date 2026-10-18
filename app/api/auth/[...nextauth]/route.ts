import NextAuth from "next-auth";
import { authOptions } from "@/auth";

const handler = NextAuth(authOptions);

export async function GET(
  req: Request,
  { params }: { params: Promise<{ nextauth: string[] }> },
) {
  return (handler as any)(req, { params });
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ nextauth: string[] }> },
) {
  return (handler as any)(req, { params });
}
