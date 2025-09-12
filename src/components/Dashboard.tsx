'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Calendar, Clock, Play, CheckCircle, AlertCircle, Dumbbell, Heart, Brain, TrendingUp, Target, Award, RefreshCw } from 'lucide-react'
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

interface WellnessStats {
  period: string
  dateRange: {
    start: string
    end: string
  }
  total: {
    scheduled: number
    completed: number
    upcoming: number
  }
  byActivity: {
    workouts: {
      scheduled: number
      completed: number
      upcoming: number
    }
    stretching: {
      scheduled: number
      completed: number
      upcoming: number
    }
    meditation: {
      scheduled: number
      completed: number
      upcoming: number
    }
  }
  completionRate: number
  events: Array<{
    id: string
    title: string
    start: string
    end: string
    completed: boolean
    type: string
  }>
}

interface DashboardProps {
  preferences: ActivityPreferences
  onPreferencesUpdate: (preferences: ActivityPreferences) => void
}

export default function Dashboard({ preferences, onPreferencesUpdate }: DashboardProps) {
  useSession()
  const [wellnessStats, setWellnessStats] = useState<WellnessStats | null>(null)
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month' | 'year'>('week')
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

  // Fetch wellness statistics
  const fetchWellnessStats = async (period: string = selectedPeriod) => {
    setRefreshing(true)
    try {
      const response = await fetch(`/api/calendar/wellness-stats?period=${period}`)
      if (!response.ok) {
        throw new Error('Failed to fetch wellness stats')
      }
      const stats = await response.json()
      setWellnessStats(stats)
    } catch (error) {
      console.error('Error fetching wellness stats:', error)
      setMessage({ type: 'error', text: 'Failed to load wellness statistics' })
    } finally {
      setRefreshing(false)
    }
  }

  // Auto-schedule activities
  const autoScheduleActivities = async () => {
    setLoading(true)
    setMessage(null)
    
    try {
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
      
      if (data.scheduledEvents && data.scheduledEvents.length > 0) {
        setMessage({ type: 'success', text: data.message || 'Successfully scheduled wellness activities!' })
        // Refresh stats after scheduling
        await fetchWellnessStats()
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

  // Load stats on component mount and when period changes
  useEffect(() => {
    fetchWellnessStats()
  }, [selectedPeriod])

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
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Wellness Dashboard</h2>
        <p className="text-slate-600">
          Track your wellness journey and stay on top of your health goals
        </p>
      </div>

      {/* Auto-Schedule Button */}
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

      {/* Period Selector */}
      <div className="flex justify-center">
        <div className="bg-white rounded-lg border border-gray-200 p-1 flex">
          {(['week', 'month', 'year'] as const).map((period) => (
            <button
              key={period}
              onClick={() => setSelectedPeriod(period)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                selectedPeriod === period
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {period.charAt(0).toUpperCase() + period.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Refresh Button */}
      <div className="flex justify-center">
        <button
          onClick={() => fetchWellnessStats()}
          disabled={refreshing}
          className="bg-slate-100 text-slate-700 px-4 py-2 rounded-lg font-medium hover:bg-slate-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? 'Refreshing...' : 'Refresh Stats'}
        </button>
      </div>

      {/* Message */}
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

      {/* Wellness Stats */}
      {wellnessStats && (
        <div className="space-y-6">
          {/* Overall Progress */}
          <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl p-6 text-white">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold">Overall Progress</h3>
              <div className="text-right">
                <div className="text-3xl font-bold">{wellnessStats.completionRate}%</div>
                <div className="text-blue-100">Completion Rate</div>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold">{wellnessStats.total.scheduled}</div>
                <div className="text-blue-100 text-sm">Scheduled</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{wellnessStats.total.completed}</div>
                <div className="text-blue-100 text-sm">Completed</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{wellnessStats.total.upcoming}</div>
                <div className="text-blue-100 text-sm">Upcoming</div>
              </div>
            </div>
            <div className="mt-4">
              <div className="bg-white/20 rounded-full h-2">
                <div 
                  className="bg-white rounded-full h-2 transition-all duration-500"
                  style={{ width: `${wellnessStats.completionRate}%` }}
                ></div>
              </div>
            </div>
          </div>

          {/* Activity Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {enabledActivities.map((activity) => {
              const stats = wellnessStats.byActivity[activity.id]
              const Icon = activity.icon
              
              if (!stats) return null
              
              const completionRate = stats.scheduled > 0 ? Math.round((stats.completed / stats.scheduled) * 100) : 0
              
              return (
                <div key={activity.id} className={`${activity.bgColor} ${activity.borderColor} border-2 rounded-xl p-6`}>
                  <div className="flex items-center gap-3 mb-4">
                    <div className={`p-3 rounded-lg ${activity.color.replace('text-', 'bg-').replace('-600', '-100')}`}>
                      <Icon className={`w-6 h-6 ${activity.color}`} />
                    </div>
                    <div>
                      <h4 className={`font-bold text-lg ${activity.color}`}>{activity.title}</h4>
                      <p className="text-slate-600 text-sm">{activity.duration} min sessions</p>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600">Completed</span>
                      <span className="font-semibold">{stats.completed}/{stats.scheduled}</span>
                    </div>
                    <div className="bg-white/50 rounded-full h-2">
                      <div 
                        className={`${activity.color.replace('text-', 'bg-')} rounded-full h-2 transition-all duration-500`}
                        style={{ width: `${completionRate}%` }}
                      ></div>
                    </div>
                    <div className="text-center">
                      <span className={`text-2xl font-bold ${activity.color}`}>{completionRate}%</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Recent Events */}
          {wellnessStats.events.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Recent Activities</h3>
              <div className="space-y-3">
                {wellnessStats.events.slice(0, 5).map((event) => {
                  const activity = activityTypes.find(a => a.id === event.type)
                  const Icon = activity?.icon || Calendar
                  
                  return (
                    <div key={event.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <div className={`p-2 rounded-lg ${activity?.color.replace('text-', 'bg-').replace('-600', '-100') || 'bg-gray-100'}`}>
                        <Icon className={`w-4 h-4 ${activity?.color || 'text-gray-600'}`} />
                      </div>
                      <div className="flex-1">
                        <div className="font-medium text-slate-900">{event.title}</div>
                        <div className="text-sm text-slate-600">
                          {formatDate(event.start)} at {formatTime(event.start)}
                        </div>
                      </div>
                      <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                        event.completed 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-blue-100 text-blue-700'
                      }`}>
                        {event.completed ? 'Completed' : 'Upcoming'}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* No Activities Selected */}
      {enabledActivities.length === 0 && (
        <div className="text-center py-12">
          <Target className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-900 mb-2">No activities selected</h3>
          <p className="text-slate-600 mb-4">
            Please select at least one activity type in settings to start tracking your wellness journey
          </p>
        </div>
      )}

      {/* Loading State */}
      {!wellnessStats && !refreshing && (
        <div className="text-center py-12">
          <TrendingUp className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-900 mb-2">Loading your wellness data...</h3>
        </div>
      )}
    </div>
  )
}
