'use client'

import { useState, useEffect } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { Calendar, Clock, Play, CheckCircle, AlertCircle, Settings, Dumbbell, Heart, Brain, LogOut } from 'lucide-react'
import { TimeSlot } from '@/lib/calendar'
import Onboarding from './Onboarding'
import SettingsComponent from './Settings'

interface ActivityPreferences {
  workouts: boolean
  stretching: boolean
  meditation: boolean
}

interface ActivityType {
  id: keyof ActivityPreferences
  title: string
  icon: any
  color: string
  bgColor: string
  borderColor: string
  duration: number
}

export default function Dashboard() {
  useSession()
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([])
  const [loading, setLoading] = useState(false)
  const [scheduling, setScheduling] = useState<string | null>(null)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [preferences, setPreferences] = useState<ActivityPreferences>({
    workouts: true,
    stretching: false,
    meditation: false
  })
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false)

  const activityTypes: ActivityType[] = [
    {
      id: 'workouts',
      title: 'Workouts',
      icon: Dumbbell,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      duration: 30
    },
    {
      id: 'stretching',
      title: 'Stretching',
      icon: Heart,
      color: 'text-amber-600',
      bgColor: 'bg-amber-50',
      borderColor: 'border-amber-200',
      duration: 15
    },
    {
      id: 'meditation',
      title: 'Meditation',
      icon: Brain,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      borderColor: 'border-purple-200',
      duration: 5
    }
  ]

  useEffect(() => {
    checkOnboardingStatus()
  }, [])

  const checkOnboardingStatus = async () => {
    try {
      // Check localStorage first for onboarding status
      const hasCompletedOnboarding = localStorage.getItem('hasCompletedOnboarding') === 'true'
      const savedPreferences = localStorage.getItem('activityPreferences')
      
      if (hasCompletedOnboarding && savedPreferences) {
        // User has completed onboarding, use saved preferences
        setHasCompletedOnboarding(true)
        setPreferences(JSON.parse(savedPreferences))
        setShowOnboarding(false)
      } else {
        // First time user, show onboarding
        setHasCompletedOnboarding(false)
        setPreferences({
          workouts: true,
          stretching: false,
          meditation: false
        })
        setShowOnboarding(true)
      }
    } catch (error) {
      console.error('Error checking onboarding status:', error)
      // Fallback to showing onboarding
      setShowOnboarding(true)
    }
  }

  const findAvailableSlots = async () => {
    setLoading(true)
    setMessage(null)
    
    try {
      const response = await fetch('/api/calendar/slots', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error('Failed to fetch available slots')
      }

      const data = await response.json()
      // Convert ISO strings to Date objects
      const slotsWithDates = (data.slots || []).map((slot: any) => ({
        ...slot,
        start: new Date(slot.start),
        end: new Date(slot.end)
      }))
      setAvailableSlots(slotsWithDates)
      
      if (data.slots.length === 0) {
        setMessage({ type: 'error', text: 'No available time slots found. Try adjusting your preferences.' })
      }
    } catch (error) {
      console.error('Error fetching slots:', error)
      setMessage({ type: 'error', text: 'Failed to fetch available time slots. Please try again.' })
    } finally {
      setLoading(false)
    }
  }

  const scheduleActivity = async (slot: TimeSlot, activityType: string) => {
    const startDate = new Date(slot.start)
    const endDate = new Date(slot.end)
    
    setScheduling(startDate.toISOString())
    setMessage(null)
    
    try {
      const response = await fetch('/api/calendar/schedule', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          start: startDate.toISOString(),
          end: endDate.toISOString(),
          duration: slot.duration,
          activityType: activityType,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to schedule activity')
      }

      setMessage({ type: 'success', text: `${activityType} scheduled for ${startDate.toLocaleDateString()} at ${startDate.toLocaleTimeString()}` })
      
      // Remove the scheduled slot from the list
      setAvailableSlots(prev => prev.filter(s => new Date(s.start).getTime() !== startDate.getTime()))
    } catch (error) {
      console.error('Error scheduling activity:', error)
      setMessage({ type: 'error', text: 'Failed to schedule activity. Please try again.' })
    } finally {
      setScheduling(null)
    }
  }

  const handleOnboardingComplete = async (activityPreferences: ActivityPreferences) => {
    try {
      // Save to localStorage for persistence
      localStorage.setItem('hasCompletedOnboarding', 'true')
      localStorage.setItem('activityPreferences', JSON.stringify(activityPreferences))
      
      // Update state
      setPreferences(activityPreferences)
      setHasCompletedOnboarding(true)
      setShowOnboarding(false)
      
      // Also save to API (for future database integration)
      const response = await fetch('/api/preferences', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          activityPreferences,
          hasCompletedOnboarding: true
        }),
      })

      if (!response.ok) {
        console.warn('Failed to save preferences to API, but localStorage saved successfully')
      }
    } catch (error) {
      console.error('Error saving onboarding preferences:', error)
    }
  }

  const handlePreferencesUpdate = (newPreferences: ActivityPreferences) => {
    setPreferences(newPreferences)
  }

  const handleSignOut = async () => {
    try {
      await signOut({ 
        callbackUrl: '/',
        redirect: true 
      })
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  const formatTime = (date: Date | string) => {
    const dateObj = new Date(date)
    return dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  const formatDate = (date: Date | string) => {
    const dateObj = new Date(date)
    return dateObj.toLocaleDateString([], { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric' 
    })
  }

  if (showOnboarding) {
    return <Onboarding onComplete={handleOnboardingComplete} />
  }

  if (showSettings) {
    return (
      <SettingsComponent 
        onClose={() => setShowSettings(false)}
        onPreferencesUpdate={handlePreferencesUpdate}
      />
    )
  }

  const enabledActivities = activityTypes.filter(activity => preferences[activity.id])

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div className="text-center flex-1">
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Find Your Wellness Time</h2>
          <p className="text-slate-600">
            We&apos;ll scan your calendar to find the perfect time slots for your activities
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowSettings(true)}
            className="p-3 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
            title="Activity Preferences"
          >
            <Settings className="w-5 h-5" />
          </button>
          <button
            onClick={handleSignOut}
            className="p-3 text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            title="Sign Out"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>

      {enabledActivities.length > 0 && (
        <div className="flex justify-center">
          <button
            onClick={findAvailableSlots}
            disabled={loading}
            className="bg-slate-900 text-white px-8 py-3 rounded-lg font-medium hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-3"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                Finding slots...
              </>
            ) : (
              <>
                <Calendar className="w-5 h-5" />
                Find Available Slots
              </>
            )}
          </button>
        </div>
      )}

      {enabledActivities.length === 0 && (
        <div className="text-center py-8">
          <Settings className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-900 mb-2">No activities selected</h3>
          <p className="text-slate-600 mb-4">
            Please select at least one activity type in settings to get started
          </p>
          <button
            onClick={() => setShowSettings(true)}
            className="bg-slate-900 text-white px-6 py-2 rounded-lg font-medium hover:bg-slate-800 transition-colors"
          >
            Open Settings
          </button>
        </div>
      )}

      {message && (
        <div className={`p-4 rounded-lg flex items-center gap-3 ${
          message.type === 'success' 
            ? 'bg-green-50 text-green-800 border border-green-200' 
            : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          {message.type === 'success' ? (
            <CheckCircle className="w-5 h-5" />
          ) : (
            <AlertCircle className="w-5 h-5" />
          )}
          {message.text}
        </div>
      )}

      {availableSlots.length > 0 && (
        <div className="space-y-6">
          <h3 className="text-lg font-semibold text-slate-900">Available Time Slots</h3>
          
          {enabledActivities.map((activity) => {
            const activitySlots = availableSlots.filter(slot => slot.duration === activity.duration)
            const Icon = activity.icon
            
            if (activitySlots.length === 0) return null
            
            return (
              <div key={activity.id} className="space-y-4">
                <div className={`flex items-center gap-3 p-4 rounded-lg ${activity.bgColor} ${activity.borderColor} border-2`}>
                  <div className={`p-2 rounded-lg ${activity.color.replace('text-', 'bg-').replace('-600', '-100')}`}>
                    <Icon className={`w-5 h-5 ${activity.color}`} />
                  </div>
                  <div>
                    <h4 className={`font-semibold ${activity.color}`}>{activity.title}</h4>
                    <p className="text-sm text-slate-600">{activitySlots.length} slot{activitySlots.length !== 1 ? 's' : ''} available</p>
                  </div>
                </div>
                
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {activitySlots.map((slot, index) => (
                    <div
                      key={`${activity.id}-${index}`}
                      className={`bg-white rounded-lg border-2 ${activity.borderColor} p-6 hover:shadow-md transition-shadow`}
                    >
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2 text-slate-600">
                          <Calendar className="w-4 h-4" />
                          <span className="text-sm font-medium">{formatDate(slot.start)}</span>
                        </div>
                        <div className="flex items-center gap-2 text-slate-600">
                          <Clock className="w-4 h-4" />
                          <span className="text-sm font-medium">{slot.duration} min</span>
                        </div>
                      </div>
                      
                      <div className="text-2xl font-bold text-slate-900 mb-4">
                        {formatTime(slot.start)} - {formatTime(slot.end)}
                      </div>
                      
                      <button
                        onClick={() => scheduleActivity(slot, activity.title)}
                        disabled={scheduling === new Date(slot.start).toISOString()}
                        className={`w-full ${activity.color.replace('text-', 'bg-')} text-white py-2 px-4 rounded-lg font-medium hover:opacity-90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2`}
                      >
                        {scheduling === new Date(slot.start).toISOString() ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            Scheduling...
                          </>
                        ) : (
                          <>
                            <Play className="w-4 h-4" />
                            Schedule {activity.title}
                          </>
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {availableSlots.length === 0 && !loading && (
        <div className="text-center py-12">
          <Calendar className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-900 mb-2">No slots found</h3>
          <p className="text-slate-600">
            Click &quot;Find Available Slots&quot; to scan your calendar for workout opportunities
          </p>
        </div>
      )}
    </div>
  )
}
