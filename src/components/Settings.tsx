'use client'

import { useState, useEffect } from 'react'
import { signOut } from 'next-auth/react'
import { Check, Dumbbell, Heart, Brain, Settings as SettingsIcon, Save, LogOut } from 'lucide-react'

interface ActivityPreferences {
  workouts: boolean
  stretching: boolean
  meditation: boolean
}

interface SettingsProps {
  onClose: () => void
  onPreferencesUpdate: (preferences: ActivityPreferences) => void
}

export default function Settings({ onClose, onPreferencesUpdate }: SettingsProps) {
  const [preferences, setPreferences] = useState<ActivityPreferences>({
    workouts: true,
    stretching: false,
    meditation: false
  })
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    fetchPreferences()
  }, [])

  const fetchPreferences = async () => {
    try {
      const response = await fetch('/api/preferences')
      if (response.ok) {
        const data = await response.json()
        setPreferences(data.activityPreferences || {
          workouts: true,
          stretching: false,
          meditation: false
        })
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
      const response = await fetch('/api/preferences', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          activityPreferences: preferences,
          hasCompletedOnboarding: true
        }),
      })

      if (response.ok) {
        onPreferencesUpdate(preferences)
        onClose()
      }
    } catch (error) {
      console.error('Error saving preferences:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const toggleActivity = (activityId: keyof ActivityPreferences) => {
    setPreferences(prev => ({
      ...prev,
      [activityId]: !prev[activityId]
    }))
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

  const activities = [
    {
      id: 'workouts' as const,
      title: 'Workouts',
      description: 'Squeeze in a quick workout',
      icon: Dumbbell,
      color: 'bg-blue-500',
      textColor: 'text-blue-600',
      borderColor: 'border-blue-200'
    },
    {
      id: 'stretching' as const,
      title: 'Stretching',
      description: 'Short times to stretch and move',
      icon: Heart,
      color: 'bg-amber-500',
      textColor: 'text-amber-600',
      borderColor: 'border-amber-200'
    },
    {
      id: 'meditation' as const,
      title: 'Meditation',
      description: '5-min breathing and meditation breaks',
      icon: Brain,
      color: 'bg-purple-500',
      textColor: 'text-purple-600',
      borderColor: 'border-purple-200'
    }
  ]

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
          <p className="text-gray-600 mt-4">Loading settings...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <SettingsIcon className="w-6 h-6 text-gray-600" />
              <h2 className="text-2xl font-bold text-gray-900">Settings</h2>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="p-6 space-y-8">
          {/* Activity Preferences Section */}
          <div className="bg-gray-50 rounded-xl p-6">
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
                    className={`w-full p-4 rounded-xl border-2 transition-all duration-200 hover:scale-105 ${
                      isSelected
                        ? `${activity.borderColor} ${activity.color} text-white shadow-lg`
                        : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center space-x-4">
                      <div className={`p-3 rounded-lg ${
                        isSelected ? 'bg-white bg-opacity-20' : activity.color
                      }`}>
                        <Icon className={`w-5 h-5 ${
                          isSelected ? 'text-white' : 'text-white'
                        }`} />
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
                      <div className={`p-2 rounded-full ${
                        isSelected ? 'bg-white bg-opacity-20' : 'bg-gray-100'
                      }`}>
                        <Check className={`w-4 h-4 ${
                          isSelected ? 'text-white' : 'text-gray-400'
                        }`} />
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Account Section */}
          <div className="bg-gray-50 rounded-xl p-6">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Account
              </h3>
              <p className="text-gray-600">
                Manage your account and sign out
              </p>
            </div>
            <button
              onClick={handleSignOut}
              className="w-full px-6 py-3 bg-red-50 border border-red-200 text-red-700 rounded-xl hover:bg-red-100 hover:border-red-300 transition-all duration-200 flex items-center justify-center space-x-2"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out</span>
            </button>
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
