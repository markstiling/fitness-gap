'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { Calendar, Clock, Play, CheckCircle, AlertCircle } from 'lucide-react'
import { TimeSlot } from '@/lib/calendar'

export default function Dashboard() {
  useSession()
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([])
  const [loading, setLoading] = useState(false)
  const [scheduling, setScheduling] = useState<string | null>(null)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

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

  const scheduleWorkout = async (slot: TimeSlot) => {
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
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to schedule workout')
      }

      setMessage({ type: 'success', text: `Workout scheduled for ${startDate.toLocaleDateString()} at ${startDate.toLocaleTimeString()}` })
      
      // Remove the scheduled slot from the list
      setAvailableSlots(prev => prev.filter(s => new Date(s.start).getTime() !== startDate.getTime()))
    } catch (error) {
      console.error('Error scheduling workout:', error)
      setMessage({ type: 'error', text: 'Failed to schedule workout. Please try again.' })
    } finally {
      setScheduling(null)
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

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Find Your Workout Time</h2>
        <p className="text-slate-600">
          We&apos;ll scan your calendar to find the perfect time slots for your workouts
        </p>
      </div>

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
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-slate-900">Available Time Slots</h3>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {availableSlots.map((slot, index) => (
              <div
                key={index}
                className="bg-white rounded-lg border border-slate-200 p-6 hover:shadow-md transition-shadow"
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
                
                <div className="text-2xl font-bold text-slate-900 mb-2">
                  {formatTime(slot.start)} - {formatTime(slot.end)}
                </div>
                
                <button
                  onClick={() => scheduleWorkout(slot)}
                  disabled={scheduling === new Date(slot.start).toISOString()}
                  className="w-full bg-slate-900 text-white py-2 px-4 rounded-lg font-medium hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {scheduling === new Date(slot.start).toISOString() ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Scheduling...
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4" />
                      Schedule Workout
                    </>
                  )}
                </button>
              </div>
            ))}
          </div>
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
