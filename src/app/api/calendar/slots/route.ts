import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { google } from 'googleapis'

export async function POST() {
  try {
    const session = await getServerSession()
    
    if (!session?.user?.email) {
      console.log('No session found')
      return NextResponse.json({ error: 'Unauthorized - no session found' }, { status: 401 })
    }

    console.log('Session found for user:', session.user.email)
    console.log('Session keys:', Object.keys(session))

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
          start: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
          end: new Date(Date.now() + 4.5 * 60 * 60 * 1000).toISOString(),
          duration: 30
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
    
    // Generate available slots (simplified algorithm)
    const availableSlots = []
    const slotDuration = 30 // 30 minutes
    const startHour = 9 // 9 AM
    const endHour = 18 // 6 PM
    
    // Check each day for the next 7 days
    for (let day = 0; day < 7; day++) {
      const currentDay = new Date(now.getTime() + day * 24 * 60 * 60 * 1000)
      
      // Skip weekends for now
      if (currentDay.getDay() === 0 || currentDay.getDay() === 6) continue
      
      // Check each hour from startHour to endHour
      for (let hour = startHour; hour < endHour; hour++) {
        const slotStart = new Date(currentDay)
        slotStart.setHours(hour, 0, 0, 0)
        const slotEnd = new Date(slotStart.getTime() + slotDuration * 60 * 1000)
        
        // Check if this slot conflicts with busy times
        const isBusy = busyTimes.some((busy: any) => {
          const busyStart = new Date(busy.start)
          const busyEnd = new Date(busy.end)
          return (slotStart < busyEnd && slotEnd > busyStart)
        })
        
        // Only add slots that are in the future and not busy
        if (!isBusy && slotStart > now && availableSlots.length < 5) {
          availableSlots.push({
            start: slotStart.toISOString(),
            end: slotEnd.toISOString(),
            duration: slotDuration
          })
        }
      }
    }

    // If no real slots found, return some demo slots
    if (availableSlots.length === 0) {
      const mockSlots = [
        {
          start: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
          end: new Date(Date.now() + 2.5 * 60 * 60 * 1000).toISOString(),
          duration: 30
        },
        {
          start: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
          end: new Date(Date.now() + 4.5 * 60 * 60 * 1000).toISOString(),
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
  } catch (error) {
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
