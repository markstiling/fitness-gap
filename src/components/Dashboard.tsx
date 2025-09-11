'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Calendar, Clock, Play, CheckCircle, AlertCircle, Dumbbell, Heart, Brain } from 'lucide-react'
import { TimeSlot } from '@/lib/calendar'

interface ActivityPreferences {
  workouts: boolean
  stretching: boolean
  meditation: boolean
  earliestWorkoutTime: string
  latestWorkoutTime: string
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

interface DashboardProps {
  preferences: ActivityPreferences
  onPreferencesUpdate: (preferences: ActivityPreferences) => void
}

export default function Dashboard({ preferences, onPreferencesUpdate }: DashboardProps) {
  useSession()
  const [scheduledEvents, setScheduledEvents] = useState<any[]>([])
  const [schedulingResults, setSchedulingResults] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

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


  const autoScheduleActivities = async () => {
    setLoading(true)
    setMessage(null)
    
    try {
      // Get user preferences from localStorage
      const userPreferences = localStorage.getItem('userPreferences')
      const parsedUserPreferences = userPreferences ? JSON.parse(userPreferences) : {
        earliestWorkoutTime: preferences.earliestWorkoutTime,
        latestWorkoutTime: preferences.latestWorkoutTime
      }
      
      const response = await fetch('/api/calendar/auto-schedule', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          activityPreferences: preferences,
          userPreferences: parsedUserPreferences
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to auto-schedule activities')
      }

      const data = await response.json()
      setScheduledEvents(data.scheduledEvents || [])
      setSchedulingResults(data.schedulingResults || null)
      
      if (data.scheduledEvents && data.scheduledEvents.length > 0) {
        setMessage({ type: 'success', text: data.message || 'Successfully scheduled wellness activities!' })
      } else {
        setMessage({ type: 'error', text: 'No available time slots found for scheduling activities.' })
      }
    } catch (error) {
      console.error('Error auto-scheduling activities:', error)
      setMessage({ type: 'error', text: 'Failed to auto-schedule activities. Please try again.' })
    } finally {
      setLoading(false)
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



  const enabledActivities = activityTypes.filter(activity => preferences[activity.id])

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Find Your Wellness Time</h2>
        <p className="text-slate-600">
          We&apos;ll scan your calendar to find the perfect time slots for your activities
        </p>
      </div>

      {enabledActivities.length > 0 && (
        <div className="flex justify-center">
          <button
            onClick={autoScheduleActivities}
            disabled={loading}
            className="bg-slate-900 text-white px-8 py-3 rounded-lg font-medium hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-3"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                Scheduling activities...
              </>
            ) : (
              <>
                <Calendar className="w-5 h-5" />
                Auto-Schedule This Week
              </>
            )}
          </button>
        </div>
      )}

      {enabledActivities.length === 0 && (
        <div className="text-center py-8">
          <Dumbbell className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-900 mb-2">No activities selected</h3>
          <p className="text-slate-600 mb-4">
            Please select at least one activity type in settings to get started
          </p>
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

      {schedulingResults && (
        <div className="space-y-6">
          <h3 className="text-lg font-semibold text-slate-900">Scheduling Results</h3>
          
          {enabledActivities.map((activity) => {
            const result = schedulingResults[activity.id]
            const Icon = activity.icon
            
            if (!result) return null
            
            return (
              <div key={activity.id} className="space-y-4">
                <div className={`flex items-center gap-3 p-4 rounded-lg ${activity.bgColor} ${activity.borderColor} border-2`}>
                  <div className={`p-2 rounded-lg ${activity.color.replace('text-', 'bg-').replace('-600', '-100')}`}>
                    <Icon className={`w-5 h-5 ${activity.color}`} />
                  </div>
                  <div>
                    <h4 className={`font-semibold ${activity.color}`}>{activity.title}</h4>
                    <p className="text-sm text-slate-600">
                      {result.scheduled} scheduled, {result.failed} failed
                    </p>
                  </div>
                </div>
                
                <div className="bg-white rounded-lg border border-gray-200 p-4">
                  <h5 className="font-medium text-slate-900 mb-2">Days scheduled:</h5>
                  <div className="flex flex-wrap gap-2">
                    {result.days.map((day: string, index: number) => (
                      <span
                        key={index}
                        className={`px-3 py-1 rounded-full text-sm ${
                          day.includes('no available time')
                            ? 'bg-red-100 text-red-700'
                            : 'bg-green-100 text-green-700'
                        }`}
                      >
                        {day}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {!schedulingResults && !loading && (
        <div className="text-center py-12">
          <Calendar className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-900 mb-2">Ready to schedule your week</h3>
          <p className="text-slate-600">
            Click &quot;Auto-Schedule This Week&quot; to automatically schedule your wellness activities 
            for the next 7 business days based on your preferences.
          </p>
        </div>
      )}
    </div>
  )
}
