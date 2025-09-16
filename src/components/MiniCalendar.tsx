'use client'

import { useState, useEffect } from 'react'
import { Calendar, CheckCircle, Clock, Dumbbell, Heart, Brain } from 'lucide-react'

interface WellnessEvent {
  id: string
  title: string
  start: string
  end: string
  completed: boolean
  type: string
}

interface MiniCalendarProps {
  events: WellnessEvent[]
}

const MiniCalendar = ({ events }: MiniCalendarProps) => {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [currentWeek, setCurrentWeek] = useState<Date[]>([])

  // Get the start of the current week (Monday)
  const getStartOfWeek = (date: Date) => {
    const start = new Date(date)
    const day = start.getDay()
    const diff = start.getDate() - day + (day === 0 ? -6 : 1) // Adjust when day is Sunday
    start.setDate(diff)
    start.setHours(0, 0, 0, 0)
    return start
  }

  // Generate the current week's dates
  useEffect(() => {
    const startOfWeek = getStartOfWeek(currentDate)
    const weekDates: Date[] = []
    
    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek)
      date.setDate(startOfWeek.getDate() + i)
      weekDates.push(date)
    }
    
    setCurrentWeek(weekDates)
  }, [currentDate])

  // Get events for a specific date
  const getEventsForDate = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0]
    return events.filter(event => {
      const eventDate = new Date(event.start).toISOString().split('T')[0]
      return eventDate === dateStr
    })
  }

  // Get activity icon based on type
  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'workout':
        return Dumbbell
      case 'stretching':
        return Heart
      case 'meditation':
        return Brain
      default:
        return Calendar
    }
  }

  // Get activity color based on type
  const getActivityColor = (type: string) => {
    switch (type) {
      case 'workout':
        return 'text-blue-600'
      case 'stretching':
        return 'text-amber-600'
      case 'meditation':
        return 'text-purple-600'
      default:
        return 'text-gray-600'
    }
  }

  // Get activity background color based on type
  const getActivityBgColor = (type: string) => {
    switch (type) {
      case 'workout':
        return 'bg-blue-100'
      case 'stretching':
        return 'bg-amber-100'
      case 'meditation':
        return 'bg-purple-100'
      default:
        return 'bg-gray-100'
    }
  }

  const formatDayName = (date: Date) => {
    return date.toLocaleDateString('en-US', { weekday: 'short' })
  }

  const formatDayNumber = (date: Date) => {
    return date.getDate()
  }

  const isToday = (date: Date) => {
    const today = new Date()
    return date.toDateString() === today.toDateString()
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="flex items-center gap-2 mb-4">
        <Calendar className="w-5 h-5 text-slate-600" />
        <h3 className="text-lg font-semibold text-slate-900">Your week at a glance</h3>
      </div>
      
      <div className="grid grid-cols-7 gap-2">
        {currentWeek.map((date, index) => {
          const dayEvents = getEventsForDate(date)
          const isCurrentDay = isToday(date)
          
          return (
            <div key={index} className="text-center">
              {/* Day name */}
              <div className="text-xs font-medium text-slate-500 mb-1">
                {formatDayName(date)}
              </div>
              
              {/* Day number and events */}
              <div className={`relative rounded-lg p-2 min-h-[120px] ${
                isCurrentDay 
                  ? 'bg-blue-100 border-2 border-blue-300' 
                  : 'bg-gray-50 border border-gray-200'
              }`}>
                <div className={`text-sm font-semibold mb-2 ${
                  isCurrentDay ? 'text-blue-700' : 'text-slate-700'
                }`}>
                  {formatDayNumber(date)}
                </div>
                
                {/* Events indicators */}
                <div className="space-y-1">
                  {dayEvents.map((event, eventIndex) => {
                    const Icon = getActivityIcon(event.type)
                    const color = getActivityColor(event.type)
                    const bgColor = getActivityBgColor(event.type)
                    
                    return (
                      <div key={eventIndex} className="flex items-center justify-center">
                        <div className={`p-1 rounded-full ${bgColor} ${color} ${
                          event.completed 
                            ? 'ring-2 ring-green-300' 
                            : 'ring-1 ring-blue-300'
                        }`}>
                          <Icon className="w-3 h-3" />
                        </div>
                      </div>
                    )
                  })}
                  
                  {/* Show message if no events */}
                  {dayEvents.length === 0 && (
                    <div className="text-xs text-slate-400 text-center mt-2">
                      No events
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
      
      {/* Legend */}
      <div className="mt-4 pt-3 border-t border-gray-200">
        <div className="grid grid-cols-2 gap-4 text-xs text-slate-600">
          <div className="space-y-2">
            <div className="font-medium text-slate-700 mb-1">Activity Types:</div>
            <div className="flex items-center gap-2">
              <div className="p-1 rounded-full bg-blue-100 text-blue-600">
                <Dumbbell className="w-3 h-3" />
              </div>
              <span>Workouts</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="p-1 rounded-full bg-amber-100 text-amber-600">
                <Heart className="w-3 h-3" />
              </div>
              <span>Stretching</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="p-1 rounded-full bg-purple-100 text-purple-600">
                <Brain className="w-3 h-3" />
              </div>
              <span>Meditation</span>
            </div>
          </div>
          <div className="space-y-2">
            <div className="font-medium text-slate-700 mb-1">Status:</div>
            <div className="flex items-center gap-2">
              <div className="p-1 rounded-full bg-blue-100 text-blue-600 ring-1 ring-blue-300">
                <Dumbbell className="w-3 h-3" />
              </div>
              <span>Scheduled</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="p-1 rounded-full bg-blue-100 text-blue-600 ring-2 ring-green-300">
                <Dumbbell className="w-3 h-3" />
              </div>
              <span>Completed</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default MiniCalendar
