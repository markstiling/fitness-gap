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
      console.log('Session callback - token keys:', Object.keys(token))
      console.log('Session callback - accessToken:', token.accessToken ? 'present' : 'missing')
      
      if (session.user && token.sub) {
        session.user.id = token.sub
      }
      // Include the access token in the session
      if (token.accessToken) {
        (session as any).accessToken = token.accessToken
        console.log('Added access token to session')
      }
      return session
    },
    async jwt({ token, user, account }: { token: any; user: any; account: any }) {
      console.log('JWT callback - account:', account ? 'present' : 'missing')
      console.log('JWT callback - access_token:', account?.access_token ? 'present' : 'missing')
      
      if (user) {
        token.id = user.id
      }
      if (account) {
        token.accessToken = account.access_token
        token.refreshToken = account.refresh_token
        console.log('Stored access token in JWT token')
      }
      return token
    },
  },
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  secret: process.env.NEXTAUTH_SECRET || 'fallback-secret-for-development',
  debug: process.env.NODE_ENV === 'development',
  pages: {
    signIn: '/',
    error: '/',
  },
  jwt: {
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
})

export { handler as GET, handler as POST }
