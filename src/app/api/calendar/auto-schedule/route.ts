import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { google } from 'googleapis'
import { authOptions } from '../../auth/[...nextauth]/route'

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      console.log('No session found')
      return NextResponse.json({ error: 'Unauthorized - no session found' }, { status: 401 })
    }

    // Get user preferences from request body
    const body = await request.json()
    const { activityPreferences, userPreferences } = body

    console.log('Auto-scheduling for user:', session.user.email)
    console.log('Activity preferences:', activityPreferences)
    console.log('User preferences:', userPreferences)

    // Get the access token from the session
    const accessToken = (session as any).accessToken
    
    if (!accessToken) {
      return NextResponse.json({ 
        error: 'No access token found. Please sign in again and grant calendar permissions.',
        scheduledEvents: []
      }, { status: 401 })
    }

    // Initialize Google Calendar API
    const oauth2Client = new google.auth.OAuth2()
    oauth2Client.setCredentials({ access_token: accessToken })
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client })

    // Get free/busy information for the next 7 days
    const now = new Date()
    const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

    const freeBusyResponse = await calendar.freebusy.query({
      resource: {
        timeMin: now.toISOString(),
        timeMax: nextWeek.toISOString(),
        items: [{ id: 'primary' }],
      },
    })

    const busyTimes = freeBusyResponse.data.calendars?.primary?.busy || []
    
    // Parse user's time preferences
    const [earliestHour, earliestMinute] = userPreferences.earliestWorkoutTime.split(':').map(Number)
    const [latestHour, latestMinute] = userPreferences.latestWorkoutTime.split(':').map(Number)
    
    const scheduledEvents = []
    const schedulingResults = {
      workouts: { scheduled: 0, failed: 0, days: [] },
      stretching: { scheduled: 0, failed: 0, days: [] },
      meditation: { scheduled: 0, failed: 0, days: [] }
    }

    // Check each business day for the next 7 days
    for (let day = 0; day < 7; day++) {
      const currentDay = new Date(now.getTime() + day * 24 * 60 * 60 * 1000)
      
      // Skip weekends
      if (currentDay.getDay() === 0 || currentDay.getDay() === 6) continue
      
      const dayName = currentDay.toLocaleDateString('en-US', { weekday: 'long' })
      
      // Schedule workouts (1 per day)
      if (activityPreferences.workouts) {
        const workoutSlot = findAvailableSlot(
          currentDay, 
          earliestHour, 
          latestHour, 
          busyTimes, 
          30, // 30 minutes
          now
        )
        
        if (workoutSlot) {
          try {
            const event = await createCalendarEvent(
              calendar,
              'Workout Session',
              'Time for a quick workout to boost your energy!',
              workoutSlot.start,
              workoutSlot.end
            )
            scheduledEvents.push(event)
            schedulingResults.workouts.scheduled++
            schedulingResults.workouts.days.push(dayName)
          } catch (error) {
            console.error('Failed to schedule workout:', error)
            schedulingResults.workouts.failed++
          }
        } else {
          schedulingResults.workouts.failed++
          schedulingResults.workouts.days.push(`${dayName} (no available time)`)
        }
      }

      // Schedule stretching (2 per day)
      if (activityPreferences.stretching) {
        for (let i = 0; i < 2; i++) {
          const stretchSlot = findAvailableSlot(
            currentDay, 
            earliestHour, 
            latestHour, 
            busyTimes, 
            15, // 15 minutes
            now
          )
          
          if (stretchSlot) {
            try {
              const event = await createCalendarEvent(
                calendar,
                'Stretching Break',
                'Take a moment to stretch and move your body.',
                stretchSlot.start,
                stretchSlot.end
              )
              scheduledEvents.push(event)
              schedulingResults.stretching.scheduled++
              if (i === 0) schedulingResults.stretching.days.push(dayName)
            } catch (error) {
              console.error('Failed to schedule stretching:', error)
              schedulingResults.stretching.failed++
            }
          } else {
            schedulingResults.stretching.failed++
            if (i === 0) schedulingResults.stretching.days.push(`${dayName} (no available time)`)
          }
        }
      }

      // Schedule meditation (2 per day)
      if (activityPreferences.meditation) {
        for (let i = 0; i < 2; i++) {
          const meditationSlot = findAvailableSlot(
            currentDay, 
            earliestHour, 
            latestHour, 
            busyTimes, 
            5, // 5 minutes
            now
          )
          
          if (meditationSlot) {
            try {
              const event = await createCalendarEvent(
                calendar,
                'Meditation Break',
                'Take a moment to breathe and center yourself.',
                meditationSlot.start,
                meditationSlot.end
              )
              scheduledEvents.push(event)
              schedulingResults.meditation.scheduled++
              if (i === 0) schedulingResults.meditation.days.push(dayName)
            } catch (error) {
              console.error('Failed to schedule meditation:', error)
              schedulingResults.meditation.failed++
            }
          } else {
            schedulingResults.meditation.failed++
            if (i === 0) schedulingResults.meditation.days.push(`${dayName} (no available time)`)
          }
        }
      }
    }

    return NextResponse.json({ 
      success: true,
      message: `Scheduled ${scheduledEvents.length} wellness activities for the week`,
      scheduledEvents,
      schedulingResults
    })

  } catch (error: any) {
    console.error('Error auto-scheduling activities:', error)
    
    // Handle specific Google API errors
    if (error.code === 403) {
      return NextResponse.json({ 
        error: 'Calendar access denied. Please sign in again and grant calendar permissions.' 
      }, { status: 403 })
    }
    
    return NextResponse.json(
      { error: 'Failed to auto-schedule activities. Please try again.' },
      { status: 500 }
    )
  }
}

// Helper function to find available slots
function findAvailableSlot(
  day: Date, 
  startHour: number, 
  endHour: number, 
  busyTimes: any[], 
  durationMinutes: number,
  now: Date
) {
  // Check each hour from start to end
  for (let hour = startHour; hour < endHour; hour++) {
    const slotStart = new Date(day)
    slotStart.setHours(hour, 0, 0, 0)
    const slotEnd = new Date(slotStart.getTime() + durationMinutes * 60 * 1000)
    
    // Skip if slot is in the past
    if (slotStart <= now) continue
    
    // Check if this slot conflicts with busy times
    const isBusy = busyTimes.some((busy: any) => {
      const busyStart = new Date(busy.start)
      const busyEnd = new Date(busy.end)
      return (slotStart < busyEnd && slotEnd > busyStart)
    })
    
    if (!isBusy) {
      return { start: slotStart, end: slotEnd }
    }
  }
  
  return null
}

// Helper function to create calendar events
async function createCalendarEvent(
  calendar: any,
  title: string,
  description: string,
  start: Date,
  end: Date
) {
  const event = {
    summary: title,
    description: description,
    start: {
      dateTime: start.toISOString(),
      timeZone: 'America/New_York', // TODO: Use user's timezone
    },
    end: {
      dateTime: end.toISOString(),
      timeZone: 'America/New_York', // TODO: Use user's timezone
    },
    reminders: {
      useDefault: false,
      overrides: [
        { method: 'popup', minutes: 5 }, // 5 minutes before
      ],
    },
  }

  const response = await calendar.events.insert({
    calendarId: 'primary',
    resource: event,
  })

  return {
    id: response.data.id,
    title: event.summary,
    start: start.toISOString(),
    end: end.toISOString(),
    link: response.data.htmlLink
  }
}
