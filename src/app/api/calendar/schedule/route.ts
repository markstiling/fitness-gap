import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { google } from 'googleapis'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession()
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { start, end, duration } = await request.json()

    if (!start || !end || !duration) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Get the access token from the session
    const accessToken = (session as any).accessToken
    
    if (!accessToken) {
      return NextResponse.json({ 
        error: 'No Google Calendar access. Please sign in again and grant calendar permissions.' 
      }, { status: 403 })
    }

    // Create Google Calendar API client
    const oauth2Client = new google.auth.OAuth2()
    oauth2Client.setCredentials({ access_token: accessToken })
    
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client })

    // Create the calendar event
    const event = {
      summary: 'Fitness Workout',
      description: `Scheduled workout session (${duration} minutes)`,
      start: {
        dateTime: start,
        timeZone: 'UTC',
      },
      end: {
        dateTime: end,
        timeZone: 'UTC',
      },
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'email', minutes: 24 * 60 }, // 1 day before
          { method: 'popup', minutes: 30 }, // 30 minutes before
        ],
      },
    }

    // Insert the event
    const response = await calendar.events.insert({
      calendarId: 'primary',
      resource: event,
    })

    return NextResponse.json({ 
      success: true, 
      message: 'Workout scheduled successfully!',
      eventId: response.data.id,
      eventLink: response.data.htmlLink
    })
  } catch (error) {
    console.error('Error scheduling workout:', error)
    
    // Handle specific Google API errors
    if (error.code === 403) {
      return NextResponse.json({ 
        error: 'Calendar access denied. Please sign in again and grant calendar permissions.' 
      }, { status: 403 })
    }
    
    return NextResponse.json(
      { error: 'Failed to schedule workout. Please try again.' },
      { status: 500 }
    )
  }
}
