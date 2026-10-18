import NextAuth, { type NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { getServerSession } from "next-auth/next";
import { db } from "@/drizzle/db";
import { users } from "@/drizzle/schema";
import { eq } from "drizzle-orm";
import { compare } from "bcryptjs";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.email, String(credentials.email)));

        if (!user || !user.password) return null;

        if (!user.emailVerified) {
          throw new Error("Please verify your email before signing in.");
        }

        const valid = await compare(String(credentials.password), user.password);
        if (!valid) return null;

        return {
          id: String(user.id),
          name: user.name,
          email: user.email,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id; // string of the DB id
        token.role = (user as any).role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.sub;
        (session.user as any).role = token.role;
      }
      return session;
    },
  },
  pages: { signIn: "/login" },
  secret: process.env.NEXTAUTH_SECRET,
};

/**
 * Server-side session. Use `await auth()` in Server Components.
 * Returns the session (with `session.user.id` and `session.user.role`) or null.
 */
export const auth = () => getServerSession(authOptions);

export default NextAuth(authOptions);
