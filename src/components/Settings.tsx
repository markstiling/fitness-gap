'use client'

import { useState, useEffect } from 'react'
import { Check, Dumbbell, Heart, Brain, Settings as SettingsIcon, Save, Clock } from 'lucide-react'

interface ActivityPreferences {
  workouts: boolean
  stretching: boolean
  meditation: boolean
  earliestWorkoutTime: string
  latestWorkoutTime: string
}

interface UserPreferences {
  preferredWorkoutDuration: number
  timezone: string
}

interface SettingsProps {
  onClose: () => void
  onPreferencesUpdate: (preferences: ActivityPreferences) => void
  onActivitiesRemoved?: () => void
}

export default function Settings({ onClose, onPreferencesUpdate, onActivitiesRemoved }: SettingsProps) {
  const [preferences, setPreferences] = useState<ActivityPreferences>({
    workouts: true,
    stretching: false,
    meditation: false,
    earliestWorkoutTime: '06:00',
    latestWorkoutTime: '22:00'
  })
  const [userPreferences, setUserPreferences] = useState<UserPreferences>({
    preferredWorkoutDuration: 30,
    timezone: typeof window !== 'undefined' ? Intl.DateTimeFormat().resolvedOptions().timeZone : 'America/New_York',
  })
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isRemovingActivities, setIsRemovingActivities] = useState(false)

  useEffect(() => {
    fetchPreferences()
  }, [])

  const fetchPreferences = async () => {
    try {
      // First try to load from localStorage
      const savedPreferences = localStorage.getItem('activityPreferences')
      const savedUserPreferences = localStorage.getItem('userPreferences')
      
      if (savedPreferences) {
        const parsed = JSON.parse(savedPreferences)
        setPreferences(parsed)
      }
      
      if (savedUserPreferences) {
        setUserPreferences(JSON.parse(savedUserPreferences))
      }
      
      // Fallback to API if no localStorage data
      if (!savedPreferences || !savedUserPreferences) {
        const response = await fetch('/api/preferences')
        if (response.ok) {
          const data = await response.json()
          if (!savedPreferences) {
            setPreferences({
              workouts: data.activityPreferences?.workouts || true,
              stretching: data.activityPreferences?.stretching || false,
              meditation: data.activityPreferences?.meditation || false,
              earliestWorkoutTime: data.earliestWorkoutTime || '06:00',
              latestWorkoutTime: data.latestWorkoutTime || '22:00'
            })
          }
          if (!savedUserPreferences) {
            setUserPreferences({
              preferredWorkoutDuration: data.preferredWorkoutDuration || 30,
              timezone: data.timezone || (typeof window !== 'undefined' ? Intl.DateTimeFormat().resolvedOptions().timeZone : 'America/New_York'),
            })
          }
        }
      }
    } catch (error) {
      console.error('Error fetching preferences:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const savePreferences = async () => {
    setIsSaving(true)
    try {
      console.log('Saving preferences:', { preferences, userPreferences })
      
      // Save to localStorage for persistence
      localStorage.setItem('activityPreferences', JSON.stringify(preferences))
      localStorage.setItem('userPreferences', JSON.stringify(userPreferences))
      
      // Update parent component
      onPreferencesUpdate(preferences)
      
      // Also save to API (for future database integration)
      const response = await fetch('/api/preferences', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          activityPreferences: preferences,
          userPreferences: userPreferences,
          hasCompletedOnboarding: true
        }),
      })

      if (response.ok) {
        console.log('Preferences saved successfully')
        onClose()
      } else {
        console.warn('Failed to save preferences to API, but localStorage saved successfully')
        onClose() // Still close the modal since localStorage worked
      }
    } catch (error) {
      console.error('Error saving preferences:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const removeAllScheduledActivities = async () => {
    setIsRemovingActivities(true)
    try {
      const response = await fetch('/api/calendar/remove-scheduled', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error('Failed to remove scheduled activities')
      }

      const data = await response.json()
      console.log('Removed activities:', data)
      
      // Show success message (you could add a toast notification here)
      alert(`Successfully removed ${data.removedCount} scheduled activities from your calendar!`)
      
      // Notify parent component that activities were removed
      if (onActivitiesRemoved) {
        onActivitiesRemoved()
      }
      
    } catch (error) {
      console.error('Error removing scheduled activities:', error)
      alert('Failed to remove scheduled activities. Please try again.')
    } finally {
      setIsRemovingActivities(false)
    }
  }

  const toggleActivity = (activityId: keyof ActivityPreferences) => {
    setPreferences(prev => ({
      ...prev,
      [activityId]: !prev[activityId]
    }))
  }


  const activities = [
    {
      id: 'workouts' as const,
      title: 'Workouts',
      description: 'Squeeze in a quick workout',
      icon: Dumbbell,
      color: 'bg-gradient-to-br from-blue-500 to-blue-600',
      textColor: 'text-blue-600',
      borderColor: 'border-blue-200'
    },
    {
      id: 'stretching' as const,
      title: 'Stretching',
      description: 'Short times to stretch and move',
      icon: Heart,
      color: 'bg-gradient-to-br from-amber-500 to-amber-600',
      textColor: 'text-amber-600',
      borderColor: 'border-amber-200'
    },
    {
      id: 'meditation' as const,
      title: 'Meditation',
      description: '5-min breathing and meditation breaks',
      icon: Brain,
      color: 'bg-gradient-to-br from-purple-500 to-purple-600',
      textColor: 'text-purple-600',
      borderColor: 'border-purple-200'
    }
  ]

  if (isLoading) {
    return (
      <div 
        className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50"
        onClick={onClose}
      >
        <div 
          className="bg-white/90 backdrop-blur-md rounded-xl p-8 border border-white/20"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
          <p className="text-gray-600 mt-4">Loading settings...</p>
        </div>
      </div>
    )
  }

  return (
    <div 
      className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div 
        className="bg-white/90 backdrop-blur-md rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-white/20"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <SettingsIcon className="w-6 h-6 text-gray-600" />
              <h2 className="text-2xl font-bold text-gray-900">Settings</h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              title="Close settings"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="p-6">
          {/* Activity Preferences Section */}
          <div className="bg-gray-50 rounded-xl p-6 mb-6">
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Activity Preferences
              </h3>
              <p className="text-gray-600">
                Choose which types of wellness activities you'd like to schedule
              </p>
            </div>

            <div className="space-y-4">
              {activities.map((activity) => {
                const Icon = activity.icon
                const isSelected = preferences[activity.id]
                
                return (
                <button
                  key={activity.id}
                  onClick={() => toggleActivity(activity.id)}
                  className={`w-full p-4 rounded-xl border-2 transition-all duration-300 hover:scale-105 transform ${
                    isSelected
                      ? `${activity.borderColor} ${activity.color} text-white shadow-xl scale-105 ring-2 ring-white ring-opacity-30`
                      : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-md'
                  }`}
                >
                  <div className="flex items-center space-x-4">
                    <div className={`p-3 rounded-lg transition-all duration-300 ${
                      isSelected 
                        ? 'bg-gray-100 scale-110' 
                        : `${activity.color} hover:scale-105`
                    }`}>
                      {isSelected ? (
                        <span className="text-2xl transition-all duration-300 drop-shadow-sm">
                          {activity.id === 'workouts' && '💪'}
                          {activity.id === 'stretching' && '🧘‍♀️'}
                          {activity.id === 'meditation' && '🧠'}
                        </span>
                      ) : (
                        <Icon className={`w-5 h-5 transition-all duration-300 text-white`} />
                      )}
                    </div>
                    <div className="flex-1 text-left">
                      <h4 className={`text-lg font-semibold ${
                        isSelected ? 'text-white' : 'text-gray-900'
                      }`}>
                        {activity.title}
                      </h4>
                      <p className={`${
                        isSelected ? 'text-white text-opacity-90' : 'text-gray-600'
                      }`}>
                        {activity.description}
                      </p>
                    </div>
                    <div className={`p-2 rounded-full transition-all duration-300 ${
                      isSelected 
                        ? 'bg-white bg-opacity-25 scale-110' 
                        : 'bg-gray-100 hover:bg-gray-200'
                    }`}>
                      <Check className={`w-4 h-4 transition-all duration-300 ${
                        isSelected 
                          ? 'text-green-500 drop-shadow-sm scale-110' 
                          : 'text-gray-400'
                      }`} />
                    </div>
                  </div>
                </button>
                )
              })}
            </div>
          </div>

          {/* Workout Preferences Section */}
          <div className="bg-gray-50 rounded-xl p-6 mb-6">
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Workout Preferences
              </h3>
              <p className="text-gray-600">
                Customize when and how long you want to work out
              </p>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Workout Duration
                </label>
                <div className="flex gap-6">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="duration"
                      value={15}
                      checked={userPreferences.preferredWorkoutDuration === 15}
                      onChange={(e) => setUserPreferences(prev => ({ ...prev, preferredWorkoutDuration: parseInt(e.target.value) }))}
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-800">15 minutes</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="duration"
                      value={30}
                      checked={userPreferences.preferredWorkoutDuration === 30}
                      onChange={(e) => setUserPreferences(prev => ({ ...prev, preferredWorkoutDuration: parseInt(e.target.value) }))}
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-800">30 minutes</span>
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Clock className="w-4 h-4 inline mr-1" />
                    Earliest Workout Time
                  </label>
                  <input
                    type="time"
                    value={preferences.earliestWorkoutTime}
                    onChange={(e) => {
                      const value = e.target.value
                      if (value) {
                        setPreferences(prev => ({ ...prev, earliestWorkoutTime: value }))
                      }
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Clock className="w-4 h-4 inline mr-1" />
                    Latest Workout Time
                  </label>
                  <input
                    type="time"
                    value={preferences.latestWorkoutTime}
                    onChange={(e) => {
                      const value = e.target.value
                      if (value) {
                        setPreferences(prev => ({ ...prev, latestWorkoutTime: value }))
                      }
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Timezone
                </label>
                <select
                  value={userPreferences.timezone}
                  onChange={(e) => setUserPreferences(prev => ({ ...prev, timezone: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="America/New_York">Eastern Time (ET)</option>
                  <option value="America/Chicago">Central Time (CT)</option>
                  <option value="America/Denver">Mountain Time (MT)</option>
                  <option value="America/Los_Angeles">Pacific Time (PT)</option>
                  <option value="Europe/London">London (GMT)</option>
                  <option value="Europe/Paris">Paris (CET)</option>
                  <option value="Asia/Tokyo">Tokyo (JST)</option>
                  <option value="Australia/Sydney">Sydney (AEST)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Scheduled Activities Management */}
          <div className="bg-red-50 rounded-xl p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Manage Scheduled Activities
            </h3>
            <p className="text-gray-600 mb-4">
              Remove all wellness activities that were automatically scheduled by FitnessGap from your calendar.
            </p>
            <div className="flex justify-center">
              <button
                onClick={removeAllScheduledActivities}
                disabled={isRemovingActivities}
                className="bg-red-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
              {isRemovingActivities ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Removing Activities...</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  <span>Remove All Scheduled Activities</span>
                </>
              )}
              </button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-4">
            <button
              onClick={onClose}
              className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={savePreferences}
              disabled={isSaving}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl hover:from-blue-600 hover:to-purple-700 transition-all duration-200 flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Save Changes</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
