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

    console.log('Smart scheduling for user:', session.user.email)
    console.log('Current activity preferences:', activityPreferences)
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

    // Get date range for current month
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    endOfMonth.setHours(23, 59, 59, 999) // End of the last day of the month

    // Get existing FitnessGap events for the month
    const eventsResponse = await calendar.events.list({
      calendarId: 'primary',
      timeMin: startOfMonth.toISOString(),
      timeMax: endOfMonth.toISOString(),
      singleEvents: true,
      orderBy: 'startTime',
    })

    const existingEvents = eventsResponse.data.items || []
    const existingFitnessGapEvents = existingEvents.filter(event => {
      const title = event.summary || ''
      return title.includes('Workout Session') || 
             title.includes('Stretching Break') || 
             title.includes('Meditation Break')
    })

    console.log('Existing FitnessGap events:', existingFitnessGapEvents.length)

    // Categorize existing events by type
    const existingByType = {
      workouts: existingFitnessGapEvents.filter(e => e.summary?.includes('Workout Session')),
      stretching: existingFitnessGapEvents.filter(e => e.summary?.includes('Stretching Break')),
      meditation: existingFitnessGapEvents.filter(e => e.summary?.includes('Meditation Break'))
    }

    const results = {
      removed: { workouts: 0, stretching: 0, meditation: 0 },
      added: { workouts: 0, stretching: 0, meditation: 0 },
      kept: { workouts: 0, stretching: 0, meditation: 0 }
    }

    // Step 1: Remove events for deselected activities
    const activityTypes = ['workouts', 'stretching', 'meditation'] as const
    
    for (const activityType of activityTypes) {
      if (!activityPreferences[activityType]) {
        // User has deselected this activity, remove all existing events
        const eventsToRemove = existingByType[activityType]
        console.log(`Removing ${eventsToRemove.length} ${activityType} events (deselected)`)
        
        for (const event of eventsToRemove) {
          try {
            if (event.id) {
              await calendar.events.delete({
                calendarId: 'primary',
                eventId: event.id,
              })
              results.removed[activityType]++
              console.log(`Removed ${activityType} event: ${event.summary}`)
            }
          } catch (error) {
            console.error(`Failed to remove ${activityType} event:`, error)
          }
        }
      }
    }

    // Step 2: Get updated busy times after removals
    const updatedFreeBusyResponse = await calendar.freebusy.query({
      resource: {
        timeMin: now.toISOString(),
        timeMax: endOfMonth.toISOString(),
        items: [{ id: 'primary' }],
      },
    })

    const busyTimes = updatedFreeBusyResponse.data.calendars?.primary?.busy || []
    console.log('Updated busy times after removals:', busyTimes.length, 'events')

    // Step 3: Schedule events for selected activities
    const [earliestHour, earliestMinute] = userPreferences.earliestWorkoutTime.split(':').map(Number)
    const [latestHour, latestMinute] = userPreferences.latestWorkoutTime.split(':').map(Number)
    
    const scheduledEvents = []
    const schedulingResults = {
      workouts: { scheduled: 0, failed: 0, days: [] },
      stretching: { scheduled: 0, failed: 0, days: [] },
      meditation: { scheduled: 0, failed: 0, days: [] }
    }

    // Check each business day from today until end of month
    const currentDay = new Date(now)
    currentDay.setHours(0, 0, 0, 0) // Start of day
    
    while (currentDay <= endOfMonth) {
      // Skip weekends
      if (currentDay.getDay() === 0 || currentDay.getDay() === 6) {
        currentDay.setDate(currentDay.getDate() + 1)
        continue
      }
      
      const dayName = currentDay.toLocaleDateString('en-US', { weekday: 'long' })
      
      // Create a combined busy times list that includes both existing calendar events
      // and any events we've scheduled in this session
      const allBusyTimes = [...busyTimes]
      
      // Add any events we've already scheduled today to the busy times
      scheduledEvents.forEach(event => {
        const eventStart = new Date(event.start)
        const eventEnd = new Date(event.end)
        
        // Check if this event is on the same day
        if (eventStart.toDateString() === currentDay.toDateString()) {
          allBusyTimes.push({
            start: eventStart.toISOString(),
            end: eventEnd.toISOString()
          })
        }
      })
      
      // Schedule workouts (1 per day) - only if selected
      if (activityPreferences.workouts) {
        // Check if we already have a workout scheduled for this day
        const existingWorkoutToday = existingByType.workouts.find(event => {
          if (!event.start?.dateTime) return false
          const eventDate = new Date(event.start.dateTime)
          return eventDate.toDateString() === currentDay.toDateString()
        })

        if (!existingWorkoutToday) {
          // No existing workout, schedule a new one
          const workoutSlot = findAvailableSlot(
            currentDay, 
            earliestHour, 
            latestHour, 
            allBusyTimes, 
            30, // 30 minutes
            now
          )
          
          if (workoutSlot) {
            try {
              console.log(`Scheduling new workout for ${dayName} at ${workoutSlot.start.toLocaleTimeString()}`)
              const event = await createCalendarEvent(
                calendar,
                'Workout Session',
                'Time for a quick workout to boost your energy!',
                workoutSlot.start,
                workoutSlot.end
              )
              scheduledEvents.push(event)
              // Add this event to busy times for subsequent activities
              allBusyTimes.push({
                start: workoutSlot.start.toISOString(),
                end: workoutSlot.end.toISOString()
              })
              schedulingResults.workouts.scheduled++
              schedulingResults.workouts.days.push(dayName)
              results.added.workouts++
            } catch (error) {
              console.error('Failed to schedule workout:', error)
              schedulingResults.workouts.failed++
            }
          } else {
            console.log(`No available time for workout on ${dayName}`)
            schedulingResults.workouts.failed++
            schedulingResults.workouts.days.push(`${dayName} (no available time)`)
          }
        } else {
          // Keep existing workout
          results.kept.workouts++
          console.log(`Keeping existing workout for ${dayName}`)
        }
      }

      // Schedule stretching (2 per day) - only if selected
      if (activityPreferences.stretching) {
        const existingStretchingToday = existingByType.stretching.filter(event => {
          if (!event.start?.dateTime) return false
          const eventDate = new Date(event.start.dateTime)
          return eventDate.toDateString() === currentDay.toDateString()
        })

        const stretchingNeeded = 2 - existingStretchingToday.length
        
        if (stretchingNeeded > 0) {
          for (let i = 0; i < stretchingNeeded; i++) {
            const stretchSlot = findAvailableSlot(
              currentDay, 
              earliestHour, 
              latestHour, 
              allBusyTimes, 
              15, // 15 minutes
              now
            )
            
            if (stretchSlot) {
              try {
                console.log(`Scheduling new stretching #${i + 1} for ${dayName} at ${stretchSlot.start.toLocaleTimeString()}`)
                const event = await createCalendarEvent(
                  calendar,
                  'Stretching Break',
                  'Take a moment to stretch and move your body.',
                  stretchSlot.start,
                  stretchSlot.end
                )
                scheduledEvents.push(event)
                // Add this event to busy times for subsequent activities
                allBusyTimes.push({
                  start: stretchSlot.start.toISOString(),
                  end: stretchSlot.end.toISOString()
                })
                schedulingResults.stretching.scheduled++
                if (i === 0) schedulingResults.stretching.days.push(dayName)
                results.added.stretching++
              } catch (error) {
                console.error('Failed to schedule stretching:', error)
                schedulingResults.stretching.failed++
              }
            } else {
              console.log(`No available time for stretching #${i + 1} on ${dayName}`)
              schedulingResults.stretching.failed++
              if (i === 0) schedulingResults.stretching.days.push(`${dayName} (no available time)`)
            }
          }
        } else {
          // Keep existing stretching
          results.kept.stretching += existingStretchingToday.length
          console.log(`Keeping ${existingStretchingToday.length} existing stretching events for ${dayName}`)
        }
      }

      // Schedule meditation (2 per day) - only if selected
      if (activityPreferences.meditation) {
        const existingMeditationToday = existingByType.meditation.filter(event => {
          if (!event.start?.dateTime) return false
          const eventDate = new Date(event.start.dateTime)
          return eventDate.toDateString() === currentDay.toDateString()
        })

        const meditationNeeded = 2 - existingMeditationToday.length
        
        if (meditationNeeded > 0) {
          for (let i = 0; i < meditationNeeded; i++) {
            const meditationSlot = findAvailableSlot(
              currentDay, 
              earliestHour, 
              latestHour, 
              allBusyTimes, 
              5, // 5 minutes
              now
            )
            
            if (meditationSlot) {
              try {
                console.log(`Scheduling new meditation #${i + 1} for ${dayName} at ${meditationSlot.start.toLocaleTimeString()}`)
                const event = await createCalendarEvent(
                  calendar,
                  'Meditation Break',
                  'Take a moment to breathe and center yourself.',
                  meditationSlot.start,
                  meditationSlot.end
                )
                scheduledEvents.push(event)
                // Add this event to busy times for subsequent activities
                allBusyTimes.push({
                  start: meditationSlot.start.toISOString(),
                  end: meditationSlot.end.toISOString()
                })
                schedulingResults.meditation.scheduled++
                if (i === 0) schedulingResults.meditation.days.push(dayName)
                results.added.meditation++
              } catch (error) {
                console.error('Failed to schedule meditation:', error)
                schedulingResults.meditation.failed++
              }
            } else {
              console.log(`No available time for meditation #${i + 1} on ${dayName}`)
              schedulingResults.meditation.failed++
              if (i === 0) schedulingResults.meditation.days.push(`${dayName} (no available time)`)
            }
          }
        } else {
          // Keep existing meditation
          results.kept.meditation += existingMeditationToday.length
          console.log(`Keeping ${existingMeditationToday.length} existing meditation events for ${dayName}`)
        }
      }
      
      // Move to next day
      currentDay.setDate(currentDay.getDate() + 1)
    }

    const totalRemoved = results.removed.workouts + results.removed.stretching + results.removed.meditation
    const totalAdded = results.added.workouts + results.added.stretching + results.added.meditation
    const totalKept = results.kept.workouts + results.kept.stretching + results.kept.meditation

    let message = 'Smart scheduling completed! '
    if (totalRemoved > 0) message += `Removed ${totalRemoved} events. `
    if (totalAdded > 0) message += `Added ${totalAdded} new events. `
    if (totalKept > 0) message += `Kept ${totalKept} existing events. `

    return NextResponse.json({ 
      success: true,
      message: message.trim(),
      scheduledEvents,
      schedulingResults,
      smartResults: results
    })

  } catch (error: any) {
    console.error('Error smart scheduling activities:', error)
    
    // Handle specific Google API errors
    if (error.code === 403) {
      return NextResponse.json({ 
        error: 'Calendar access denied. Please sign in again and grant calendar permissions.' 
      }, { status: 403 })
    }
    
    return NextResponse.json(
      { error: 'Failed to smart schedule activities. Please try again.' },
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
  // Check in 15-minute intervals for better slot finding
  const intervalMinutes = 15
  const totalMinutes = (endHour - startHour) * 60
  
  for (let minutes = 0; minutes < totalMinutes; minutes += intervalMinutes) {
    const slotStart = new Date(day)
    slotStart.setHours(startHour, minutes, 0, 0)
    const slotEnd = new Date(slotStart.getTime() + durationMinutes * 60 * 1000)
    
    // Skip if slot is in the past
    if (slotStart <= now) continue
    
    // Skip if slot would extend beyond the end time
    if (slotEnd.getHours() > endHour || (slotEnd.getHours() === endHour && slotEnd.getMinutes() > 0)) {
      continue
    }
    
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
