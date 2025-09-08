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
    async jwt({ token, user, account }) {
      console.log('🔑 JWT callback called')
      console.log('🔑 Account present:', !!account)
      console.log('🔑 Access token present:', !!account?.access_token)
      
      // Persist the OAuth access_token to the token right after signin
      if (account) {
        token.accessToken = account.access_token
        token.refreshToken = account.refresh_token
        token.id = user?.id
        console.log('🔑 Stored access token in JWT')
      }
      return token
    },
    async session({ session, token }) {
      console.log('📋 Session callback called')
      console.log('📋 Token keys:', Object.keys(token))
      console.log('📋 Access token in token:', !!token.accessToken)
      
      // Send properties to the client
      if (token) {
        session.user.id = token.id
        session.accessToken = token.accessToken
        console.log('📋 Added access token to session')
      }
      return session
    },
  },
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  secret: process.env.NEXTAUTH_SECRET || 'fallback-secret-for-development',
  debug: true,
  pages: {
    signIn: '/',
    error: '/',
  },
  jwt: {
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  events: {
    async signIn({ user, account, profile }) {
      console.log('🎉 SignIn event triggered')
      console.log('🎉 Account:', account ? 'present' : 'missing')
      console.log('🎉 Access token:', account?.access_token ? 'present' : 'missing')
    },
  },
})

export { handler as GET, handler as POST }
