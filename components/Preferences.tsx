'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Clock, Save, ArrowLeft } from 'lucide-react'

interface UserPreferences {
  earliestWorkoutTime: string
  latestWorkoutTime: string
  preferredWorkoutDuration: number
  timezone: string
}

export default function Preferences() {
  useSession()
  const [preferences, setPreferences] = useState<UserPreferences>({
    earliestWorkoutTime: '06:00',
    latestWorkoutTime: '22:00',
    preferredWorkoutDuration: 30,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  })
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  useEffect(() => {
    loadPreferences()
  }, [])

  const loadPreferences = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/preferences')
      if (response.ok) {
        const data = await response.json()
        setPreferences(data)
      }
    } catch (error) {
      console.error('Error loading preferences:', error)
    } finally {
      setLoading(false)
    }
  }

  const savePreferences = async () => {
    setSaving(true)
    setMessage(null)
    
    try {
      const response = await fetch('/api/preferences', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(preferences),
      })

      if (!response.ok) {
        throw new Error('Failed to save preferences')
      }

      setMessage({ type: 'success', text: 'Preferences saved successfully!' })
    } catch (error) {
      console.error('Error saving preferences:', error)
      setMessage({ type: 'error', text: 'Failed to save preferences. Please try again.' })
    } finally {
      setSaving(false)
    }
  }

  const handleBack = () => {
    window.location.reload() // Simple way to go back to dashboard
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900"></div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div className="flex items-center gap-4">
        <button
          onClick={handleBack}
          className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Workout Preferences</h2>
          <p className="text-slate-600">Customize when and how long you want to work out</p>
        </div>
      </div>

      {message && (
        <div className={`p-4 rounded-lg flex items-center gap-3 ${
          message.type === 'success' 
            ? 'bg-green-50 text-green-800 border border-green-200' 
            : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          {message.text}
        </div>
      )}

      <div className="bg-white rounded-lg border border-slate-200 p-6 space-y-6">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Workout Duration
          </label>
          <div className="flex gap-4">
            <label className="flex items-center">
              <input
                type="radio"
                name="duration"
                value={15}
                checked={preferences.preferredWorkoutDuration === 15}
                onChange={(e) => setPreferences(prev => ({ ...prev, preferredWorkoutDuration: parseInt(e.target.value) }))}
                className="mr-2"
              />
              <span className="text-sm">15 minutes</span>
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                name="duration"
                value={30}
                checked={preferences.preferredWorkoutDuration === 30}
                onChange={(e) => setPreferences(prev => ({ ...prev, preferredWorkoutDuration: parseInt(e.target.value) }))}
                className="mr-2"
              />
              <span className="text-sm">30 minutes</span>
            </label>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              <Clock className="w-4 h-4 inline mr-1" />
              Earliest Workout Time
            </label>
            <input
              type="time"
              value={preferences.earliestWorkoutTime}
              onChange={(e) => setPreferences(prev => ({ ...prev, earliestWorkoutTime: e.target.value }))}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              <Clock className="w-4 h-4 inline mr-1" />
              Latest Workout Time
            </label>
            <input
              type="time"
              value={preferences.latestWorkoutTime}
              onChange={(e) => setPreferences(prev => ({ ...prev, latestWorkoutTime: e.target.value }))}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Timezone
          </label>
          <select
            value={preferences.timezone}
            onChange={(e) => setPreferences(prev => ({ ...prev, timezone: e.target.value }))}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent"
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

        <div className="pt-4 border-t border-slate-200">
          <button
            onClick={savePreferences}
            disabled={saving}
            className="bg-slate-900 text-white px-6 py-3 rounded-lg font-medium hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-3"
          >
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                Saving...
              </>
            ) : (
              <>
                <Save className="w-5 h-5" />
                Save Preferences
              </>
            )}
          </button>
        </div>
      </div>

      <div className="bg-slate-50 rounded-lg p-6">
        <h3 className="text-lg font-medium text-slate-900 mb-3">How it works</h3>
        <ul className="space-y-2 text-sm text-slate-600">
          <li>• We&apos;ll scan your Google Calendar for available time slots</li>
          <li>• Only slots within your preferred time range will be shown</li>
          <li>• You can choose between 15-minute or 30-minute workout sessions</li>
          <li>• Workouts will be automatically scheduled in your calendar</li>
        </ul>
      </div>
    </div>
  )
}
