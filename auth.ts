import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';

// Optional comma-separated allowlist. If unset, any Google account may sign in.
const allowedEmails = (process.env.ALLOWED_EMAILS || '')
  .split(',')
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [Google],
  pages: {
    signIn: '/signin',
    error: '/signin',
  },
  callbacks: {
    signIn({ profile }) {
      if (allowedEmails.length === 0) return true;
      const email = profile?.email?.toLowerCase();
      return !!email && profile?.email_verified === true && allowedEmails.includes(email);
    },
    jwt({ token, account }) {
      // Key user data by the stable Google account ID, captured at sign-in
      if (account) {
        token.userId = account.providerAccountId;
      }
      return token;
    },
    session({ session, token }) {
      if (token.userId) {
        session.user.id = token.userId as string;
      }
      return session;
    },
  },
});

// Returns the signed-in user's ID, or null if unauthenticated
export async function getUserId(): Promise<string | null> {
  const session = await auth();
  return session?.user?.id ?? null;
}
