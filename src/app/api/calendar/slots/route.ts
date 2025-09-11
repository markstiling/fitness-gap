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
    const userPreferences = body.userPreferences || {
      earliestWorkoutTime: '06:00',
      latestWorkoutTime: '22:00'
    }

  console.log('Session found for user:', session.user.email)
  console.log('Session keys:', Object.keys(session))
  console.log('Environment check - NODE_ENV:', process.env.NODE_ENV)
  console.log('Environment check - VERCEL:', process.env.VERCEL)

    // Get the access token from the session
    const accessToken = (session as any).accessToken
    
    if (!accessToken) {
      console.log('No access token found in session - returning demo slots')
      // Return demo slots if no access token
      const mockSlots = [
        {
          start: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
          end: new Date(Date.now() + 2.5 * 60 * 60 * 1000).toISOString(),
          duration: 30
        },
        {
          start: new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString(),
          end: new Date(Date.now() + 3.25 * 60 * 60 * 1000).toISOString(),
          duration: 15
        },
        {
          start: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
          end: new Date(Date.now() + 4.083 * 60 * 60 * 1000).toISOString(),
          duration: 5
        }
      ]
      return NextResponse.json({ 
        slots: mockSlots,
        message: 'Demo slots (calendar integration in progress - please sign out and back in)' 
      })
    }

    console.log('Access token found, length:', accessToken.length)

    // Create Google Calendar API client
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
    
    // Generate available slots for different activity types
    const availableSlots = []
    const activityTypes = [
      { duration: 30, name: 'Workouts' },
      { duration: 15, name: 'Stretching' },
      { duration: 5, name: 'Meditation' }
    ]
    
    // Parse user's time preferences
    const [earliestHour, earliestMinute] = userPreferences.earliestWorkoutTime.split(':').map(Number)
    const [latestHour, latestMinute] = userPreferences.latestWorkoutTime.split(':').map(Number)
    
    const startHour = earliestHour
    const endHour = latestHour
    
    // Check each day for the next 7 days
    for (let day = 0; day < 7; day++) {
      const currentDay = new Date(now.getTime() + day * 24 * 60 * 60 * 1000)
      
      // Skip weekends for now
      if (currentDay.getDay() === 0 || currentDay.getDay() === 6) continue
      
      // Check each hour from startHour to endHour
      for (let hour = startHour; hour < endHour; hour++) {
        // Generate slots for each activity type at this hour
        for (const activityType of activityTypes) {
          const slotStart = new Date(currentDay)
          slotStart.setHours(hour, 0, 0, 0)
          const slotEnd = new Date(slotStart.getTime() + activityType.duration * 60 * 1000)
          
          // Check if this slot conflicts with busy times
          const isBusy = busyTimes.some((busy: any) => {
            const busyStart = new Date(busy.start)
            const busyEnd = new Date(busy.end)
            return (slotStart < busyEnd && slotEnd > busyStart)
          })
          
          // Only add slots that are in the future and not busy
          if (!isBusy && slotStart > now && availableSlots.length < 30) {
            availableSlots.push({
              start: slotStart.toISOString(),
              end: slotEnd.toISOString(),
              duration: activityType.duration
            })
          }
        }
      }
    }

    // If no real slots found, return some demo slots with different durations
    if (availableSlots.length === 0) {
      const mockSlots = [
        {
          start: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
          end: new Date(Date.now() + 2.5 * 60 * 60 * 1000).toISOString(),
          duration: 30
        },
        {
          start: new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString(),
          end: new Date(Date.now() + 3.25 * 60 * 60 * 1000).toISOString(),
          duration: 15
        },
        {
          start: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
          end: new Date(Date.now() + 4.083 * 60 * 60 * 1000).toISOString(),
          duration: 5
        },
        {
          start: new Date(Date.now() + 5 * 60 * 60 * 1000).toISOString(),
          end: new Date(Date.now() + 5.5 * 60 * 60 * 1000).toISOString(),
          duration: 30
        }
      ]
      return NextResponse.json({ 
        slots: mockSlots,
        message: 'No free slots found in the next 7 days. Showing demo slots.' 
      })
    }

    return NextResponse.json({ 
      slots: availableSlots,
      message: `Found ${availableSlots.length} available slots in the next 7 days` 
    })
  } catch (error: any) {
    console.error('Error fetching calendar slots:', error)
    
    // Handle specific Google API errors
    if (error.code === 403) {
      return NextResponse.json({ 
        error: 'Calendar access denied. Please sign in again and grant calendar permissions.' 
      }, { status: 403 })
    }
    
    return NextResponse.json(
      { error: 'Failed to fetch calendar slots. Please try again.' },
      { status: 500 }
    )
  }
}
