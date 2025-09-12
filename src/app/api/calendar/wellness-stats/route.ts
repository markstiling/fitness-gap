import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { google } from 'googleapis'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period') || 'week' // week, month, year
    
    // Get the access token from the session
    const accessToken = (session as any).accessToken
    
    if (!accessToken) {
      return NextResponse.json({ error: 'No access token available' }, { status: 401 })
    }

    // Set up Google Calendar API
    const auth = new google.auth.OAuth2()
    auth.setCredentials({ access_token: accessToken })
    const calendar = google.calendar({ version: 'v3', auth })

    // Calculate date range based on period
    const now = new Date()
    let startDate: Date
    let endDate: Date

    switch (period) {
      case 'week':
        startDate = new Date(now)
        startDate.setDate(now.getDate() - now.getDay()) // Start of current week
        endDate = new Date(startDate)
        endDate.setDate(startDate.getDate() + 6) // End of current week
        break
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1)
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0)
        break
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1)
        endDate = new Date(now.getFullYear(), 11, 31)
        break
      default:
        startDate = new Date(now)
        startDate.setDate(now.getDate() - now.getDay())
        endDate = new Date(startDate)
        endDate.setDate(startDate.getDate() + 6)
    }

    // Fetch all events in the date range
    const eventsResponse = await calendar.events.list({
      calendarId: 'primary',
      timeMin: startDate.toISOString(),
      timeMax: endDate.toISOString(),
      singleEvents: true,
      orderBy: 'startTime',
    })

    const allEvents = eventsResponse.data.items || []
    
    // Filter FitnessGap events
    const fitnessGapEvents = allEvents.filter(event => 
      event.summary && (
        event.summary.includes('Workout Session') ||
        event.summary.includes('Stretching Break') ||
        event.summary.includes('Meditation Break')
      )
    )

    // Categorize events
    const workoutEvents = fitnessGapEvents.filter(event => 
      event.summary?.includes('Workout Session')
    )
    const stretchingEvents = fitnessGapEvents.filter(event => 
      event.summary?.includes('Stretching Break')
    )
    const meditationEvents = fitnessGapEvents.filter(event => 
      event.summary?.includes('Meditation Break')
    )

    // Calculate completion status (events that have passed)
    const nowISO = now.toISOString()
    const completedEvents = fitnessGapEvents.filter(event => {
      if (!event.end?.dateTime) return false
      return new Date(event.end.dateTime) < now
    })

    const completedWorkouts = completedEvents.filter(event => 
      event.summary?.includes('Workout Session')
    )
    const completedStretching = completedEvents.filter(event => 
      event.summary?.includes('Stretching Break')
    )
    const completedMeditation = completedEvents.filter(event => 
      event.summary?.includes('Meditation Break')
    )

    // Calculate statistics
    const stats = {
      period,
      dateRange: {
        start: startDate.toISOString(),
        end: endDate.toISOString()
      },
      total: {
        scheduled: fitnessGapEvents.length,
        completed: completedEvents.length,
        upcoming: fitnessGapEvents.length - completedEvents.length
      },
      byActivity: {
        workouts: {
          scheduled: workoutEvents.length,
          completed: completedWorkouts.length,
          upcoming: workoutEvents.length - completedWorkouts.length
        },
        stretching: {
          scheduled: stretchingEvents.length,
          completed: completedStretching.length,
          upcoming: stretchingEvents.length - completedStretching.length
        },
        meditation: {
          scheduled: meditationEvents.length,
          completed: completedMeditation.length,
          upcoming: meditationEvents.length - completedMeditation.length
        }
      },
      completionRate: fitnessGapEvents.length > 0 
        ? Math.round((completedEvents.length / fitnessGapEvents.length) * 100)
        : 0,
      events: fitnessGapEvents.map(event => ({
        id: event.id,
        title: event.summary,
        start: event.start?.dateTime,
        end: event.end?.dateTime,
        completed: event.end?.dateTime ? new Date(event.end.dateTime) < now : false,
        type: event.summary?.includes('Workout') ? 'workout' : 
              event.summary?.includes('Stretching') ? 'stretching' : 'meditation'
      }))
    }

    return NextResponse.json(stats)

  } catch (error) {
    console.error('Error fetching wellness stats:', error)
    return NextResponse.json(
      { error: 'Failed to fetch wellness statistics' },
      { status: 500 }
    )
  }
}
