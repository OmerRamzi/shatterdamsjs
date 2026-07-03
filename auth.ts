import NextAuth, { type DefaultSession } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { db } from "@/db";
import { users, userRoles, tenants } from "@/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: string;
      tenantId: number;
    } & DefaultSession["user"];
  }
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        
        const userList = await db.select().from(users).where(eq(users.email, credentials.email as string)).limit(1);
        const user = userList[0];
        
        if (!user) return null;
        
        // Use bcrypt to check hash
        const passwordsMatch = await bcrypt.compare(credentials.password as string, user.passwordHash);
        if (!passwordsMatch) return null;
        
        // Fetch role
        const roleList = await db.select().from(userRoles).where(eq(userRoles.userId, user.id)).limit(1);
        const role = roleList[0]?.role || "client";

        return {
          id: user.id.toString(),
          email: user.email,
          name: user.displayName,
          role: role,
          tenantId: user.tenantId,
          image: user.profileImage,
        };
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        // @ts-ignore
        token.role = user.role;
        // @ts-ignore
        token.tenantId = user.tenantId;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.tenantId = token.tenantId as number;
      }
      return session;
    }
  },
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
  },
});
