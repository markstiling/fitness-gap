'use client'

import { useSession, signIn } from 'next-auth/react'
import { useState } from 'react'
import { Settings, Dumbbell } from 'lucide-react'
import Dashboard from '@/components/Dashboard'
import Preferences from '@/components/Preferences'

export default function Home() {
  const { data: session, status } = useSession()
  const [showPreferences, setShowPreferences] = useState(false)
  const [isSigningIn, setIsSigningIn] = useState(false)

  const handleGoogleSignIn = async () => {
    setIsSigningIn(true)
    try {
      await signIn('google', { callbackUrl: '/' })
    } catch (error) {
      setIsSigningIn(false)
    }
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900"></div>
      </div>
    )
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center">
          <div className="mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-slate-900 rounded-full mb-4">
              <Dumbbell className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-slate-900 mb-2">FitnessGap</h1>
            <p className="text-slate-600">
              Automatically find and schedule workout time slots in your Google Calendar
            </p>
          </div>
          
          <div className="space-y-4">
            <button
              onClick={handleGoogleSignIn}
              disabled={isSigningIn}
              className="group relative w-full bg-slate-900 text-white py-3 px-6 rounded-lg font-medium transition-all duration-300 flex items-center justify-center gap-3 overflow-hidden
                         hover:bg-slate-800 hover:scale-[1.02] hover:shadow-lg hover:shadow-slate-900/25
                         active:scale-[0.98] active:shadow-md
                         disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none
                         animate-pulse-subtle"
            >
              {/* Animated background gradient */}
              <div className="absolute inset-0 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              
              {/* Shimmer effect */}
              <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
              
              {/* Content */}
              <div className="relative flex items-center gap-3">
                {isSigningIn ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span>Signing in...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5 transition-transform duration-300 group-hover:scale-110" viewBox="0 0 24 24">
                      <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    <span className="transition-transform duration-300 group-hover:translate-x-0.5">Continue with Google</span>
                  </>
                )}
              </div>
            </button>
            
            <div className="text-sm text-slate-500">
              We&apos;ll access your calendar to find the perfect workout times
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <header className="bg-white/80 backdrop-blur-sm border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center">
                <Dumbbell className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-xl font-bold text-slate-900">FitnessGap</h1>
            </div>
            
            <div className="flex items-center gap-4">
              <button
                onClick={() => setShowPreferences(!showPreferences)}
                className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <Settings className="w-5 h-5" />
              </button>
              
              <div className="flex items-center gap-3">
                <img
                  src={session.user?.image || ''}
                  alt={session.user?.name || ''}
                  className="w-8 h-8 rounded-full"
                />
                <span className="text-sm font-medium text-slate-700">
                  {session.user?.name}
                </span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {showPreferences ? <Preferences /> : <Dashboard />}
      </main>
    </div>
  )
}
