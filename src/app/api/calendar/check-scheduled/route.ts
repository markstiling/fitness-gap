import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { google } from 'googleapis'
import { authOptions } from '../../auth/[...nextauth]/route'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get the access token from the session
    const accessToken = (session as any).accessToken
    
    if (!accessToken) {
      return NextResponse.json({ 
        error: 'No access token found',
        hasScheduledEvents: false
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
    
    // Get all events for the current month
    const eventsResponse = await calendar.events.list({
      calendarId: 'primary',
      timeMin: startOfMonth.toISOString(),
      timeMax: endOfMonth.toISOString(),
      singleEvents: true,
      orderBy: 'startTime',
    })

    const events = eventsResponse.data.items || []
    
    // Check for FitnessGap events (workouts, stretching, meditation)
    const fitnessGapEvents = events.filter(event => {
      const title = event.summary || ''
      return title.includes('Workout Session') || 
             title.includes('Stretching Break') || 
             title.includes('Meditation Break')
    })

    // Count events by type
    const eventCounts = {
      workouts: fitnessGapEvents.filter(e => e.summary?.includes('Workout Session')).length,
      stretching: fitnessGapEvents.filter(e => e.summary?.includes('Stretching Break')).length,
      meditation: fitnessGapEvents.filter(e => e.summary?.includes('Meditation Break')).length
    }

    // Calculate expected events for the month (business days only)
    const businessDaysInMonth = getBusinessDaysInMonth(now)
    const expectedEvents = {
      workouts: businessDaysInMonth, // 1 per business day
      stretching: businessDaysInMonth * 2, // 2 per business day
      meditation: businessDaysInMonth * 2 // 2 per business day
    }

    // Check if we have a reasonable number of events scheduled
    const hasScheduledEvents = fitnessGapEvents.length > 0

    return NextResponse.json({
      hasScheduledEvents,
      eventCounts,
      expectedEvents,
      totalFitnessGapEvents: fitnessGapEvents.length,
      businessDaysInMonth
    })

  } catch (error: any) {
    console.error('Error checking scheduled events:', error)
    return NextResponse.json(
      { 
        error: 'Failed to check scheduled events',
        hasScheduledEvents: false
      },
      { status: 500 }
    )
  }
}

// Helper function to count business days in current month
function getBusinessDaysInMonth(date: Date): number {
  const year = date.getFullYear()
  const month = date.getMonth()
  const startOfMonth = new Date(year, month, 1)
  const endOfMonth = new Date(year, month + 1, 0)
  
  let businessDays = 0
  const currentDay = new Date(startOfMonth)
  
  while (currentDay <= endOfMonth) {
    const dayOfWeek = currentDay.getDay()
    // Monday = 1, Tuesday = 2, ..., Friday = 5
    if (dayOfWeek >= 1 && dayOfWeek <= 5) {
      businessDays++
    }
    currentDay.setDate(currentDay.getDate() + 1)
  }
  
  return businessDays
}
