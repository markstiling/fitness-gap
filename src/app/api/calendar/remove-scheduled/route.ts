import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { google } from 'googleapis'
import { authOptions } from '../../auth/[...nextauth]/route'

export async function POST() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      console.log('No session found')
      return NextResponse.json({ error: 'Unauthorized - no session found' }, { status: 401 })
    }

    console.log('Removing scheduled activities for user:', session.user.email)

    // Get the access token from the session
    const accessToken = (session as any).accessToken
    
    if (!accessToken) {
      return NextResponse.json({ 
        error: 'No access token found. Please sign in again and grant calendar permissions.',
        removedCount: 0
      }, { status: 401 })
    }

    // Initialize Google Calendar API
    const oauth2Client = new google.auth.OAuth2()
    oauth2Client.setCredentials({ access_token: accessToken })
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client })

    // Get events from the entire current month
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)

    const eventsResponse = await calendar.events.list({
      calendarId: 'primary',
      timeMin: startOfMonth.toISOString(),
      timeMax: endOfMonth.toISOString(),
      singleEvents: true,
      orderBy: 'startTime',
    })

    const events = eventsResponse.data.items || []
    
    // Filter for FitnessGap events (workouts, stretching, meditation)
    const fitnessGapEvents = events.filter(event => {
      const title = event.summary || ''
      return title.includes('Workout Session') || 
             title.includes('Stretching Break') || 
             title.includes('Meditation Break')
    })

    console.log(`Found ${fitnessGapEvents.length} FitnessGap events to remove`)

    let removedCount = 0
    const errors = []

    // Delete each FitnessGap event
    for (const event of fitnessGapEvents) {
      try {
        if (event.id) {
          await calendar.events.delete({
            calendarId: 'primary',
            eventId: event.id,
          })
          removedCount++
          console.log(`Removed event: ${event.summary} at ${event.start?.dateTime}`)
        }
      } catch (error) {
        console.error(`Failed to remove event ${event.id}:`, error)
        errors.push(`Failed to remove: ${event.summary}`)
      }
    }

    return NextResponse.json({ 
      success: true,
      message: `Removed ${removedCount} scheduled wellness activities`,
      removedCount,
      errors: errors.length > 0 ? errors : undefined
    })

  } catch (error: any) {
    console.error('Error removing scheduled activities:', error)
    
    // Handle specific Google API errors
    if (error.code === 403) {
      return NextResponse.json({ 
        error: 'Calendar access denied. Please sign in again and grant calendar permissions.' 
      }, { status: 403 })
    }
    
    return NextResponse.json(
      { error: 'Failed to remove scheduled activities. Please try again.' },
      { status: 500 }
    )
  }
}
