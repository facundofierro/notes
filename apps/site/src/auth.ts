import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";
import Google from "next-auth/providers/google";
import type { OAuthConfig, OAuthUserConfig } from "next-auth/providers";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { db } from "@/lib/db";
import { accounts, sessions, users, verificationTokens } from "@/lib/db/schema";

// Custom Yandex OAuth provider (not built-in to next-auth)
function Yandex(options: OAuthUserConfig<Record<string, unknown>>): OAuthConfig<Record<string, unknown>> {
  return {
    id: "yandex",
    name: "Yandex",
    type: "oauth",
    authorization: {
      url: "https://oauth.yandex.com/authorize",
      params: { scope: "login:email login:info login:avatar" },
    },
    token: "https://oauth.yandex.com/token",
    userinfo: "https://login.yandex.ru/info?format=json",
    profile(profile: Record<string, unknown>) {
      return {
        id: String(profile.id),
        name: (profile.display_name as string) ?? (profile.login as string),
        email: (profile.default_email as string) ?? null,
        image: profile.default_avatar_id
          ? `https://avatars.yandex.net/get-yapic/${profile.default_avatar_id}/islands-200`
          : null,
      };
    },
    options,
  };
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),
  providers: [
    GitHub({
      clientId: process.env.AUTH_GITHUB_ID!,
      clientSecret: process.env.AUTH_GITHUB_SECRET!,
    }),
    Google({
      clientId: process.env.AUTH_GOOGLE_ID!,
      clientSecret: process.env.AUTH_GOOGLE_SECRET!,
    }),
    Yandex({
      clientId: process.env.AUTH_YANDEX_ID!,
      clientSecret: process.env.AUTH_YANDEX_SECRET!,
    }),
  ],
  session: {
    strategy: "database",
  },
  callbacks: {
    async redirect({ url, baseUrl }) {
      if (url.startsWith("/")) {
        return `${baseUrl}${url}`;
      }

      const webAppUrl = process.env.WEB_APP_URL;
      const allowedOrigins = [baseUrl];

      if (webAppUrl) {
        try {
          allowedOrigins.push(new URL(webAppUrl).origin);
        } catch {
          // Ignore malformed WEB_APP_URL; fallback to safe default behavior.
        }
      }

      try {
        const targetOrigin = new URL(url).origin;
        if (allowedOrigins.includes(targetOrigin)) {
          return url;
        }
      } catch {
        // Ignore malformed redirect URL and fall through to baseUrl.
      }

      return baseUrl;
    },
    async session({ session, user }) {
      if (session.user && user) {
        session.user.id = user.id;
      }
      return session;
    },
  },
  pages: {
    signIn: "/auth/signin",
    error: "/auth/error",
  },
});
