/* eslint-disable @typescript-eslint/no-explicit-any */
import NextAuth from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'

const handler = NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
      authorization: {
        params: {
          scope: 'openid email profile https://www.googleapis.com/auth/calendar',
        },
      },
    }),
  ],
  callbacks: {
    async session({ session, token }: { session: any; token: any }) {
      if (session.user && token.sub) {
        session.user.id = token.sub
      }
      // Include the access token in the session
      if (token.accessToken) {
        (session as any).accessToken = token.accessToken
      }
      return session
    },
    async jwt({ token, user, account }: { token: any; user: any; account: any }) {
      if (user) {
        token.id = user.id
      }
      if (account) {
        token.accessToken = account.access_token
        token.refreshToken = account.refresh_token
      }
      return token
    },
  },
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  jwt: {
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  secret: process.env.NEXTAUTH_SECRET || 'fallback-secret-for-development',
  debug: process.env.NODE_ENV === 'development',
  pages: {
    signIn: '/',
    error: '/',
  },
})

export { handler as GET, handler as POST }
