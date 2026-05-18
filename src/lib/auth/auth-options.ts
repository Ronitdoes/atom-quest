import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { db } from "@/lib/db/db";
import { comparePassword } from "@/lib/utils/password";
import { RateLimitService } from "@/lib/services/rate-limit-service";
import { passwordSchema } from "@/lib/validators/password";

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  session: {
    strategy: "jwt",
    maxAge: 60 * 60 * 8,
    updateAge: 60 * 15,
  },
  pages: {
    signIn: "/auth/login",
  },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Missing credentials");
        }

        // Validate password complexity
        const passwordResult = passwordSchema.safeParse(credentials.password);
        if (!passwordResult.success) {
          throw new Error("Password does not meet complexity requirements");
        }

        const email = credentials.email.toLowerCase().trim();
        const rateLimit = await RateLimitService.hit(`login:${email}`, 10, 60 * 15);
        if (!rateLimit.allowed) {
          throw new Error("Invalid credentials");
        }

        const user = await db.user.findUnique({
          where: { email },
        });

        if (!user || !user.password) {
          throw new Error("Invalid credentials");
        }

        const isPasswordValid = await comparePassword(credentials.password, user.password);

        if (!isPasswordValid) {
          throw new Error("Invalid credentials");
        }

        return {
          id: user.id,
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
        token.id = user.id;
        token.role = user.role;
        token.name = user.name;
        token.roleLastChecked = Date.now();
      } else if (token.id) {
        // Fetch fresh name and role from database to keep JWT session in perfect sync on reloads
        const currentUser = await db.user.findUnique({
          where: { id: token.id },
          select: { role: true, name: true },
        });
        if (currentUser) {
          token.role = currentUser.role;
          token.name = currentUser.name;
          token.roleLastChecked = Date.now();
        } else {
          // User was deleted from the database! Clear token ID to invalidate the session
          token.id = "";
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (token && token.id) {
        session.user.id = token.id;
        session.user.role = token.role;
        session.user.name = token.name;
      } else {
        // Invalidate session if user does not exist in the DB
        return null as any;
      }
      return session;
    },
  },
};
