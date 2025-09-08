import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { CalendarService } from '@/lib/calendar'

export async function POST() {
  try {
    const session = await getServerSession()
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user preferences
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: { preferences: true }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Get user's Google account with access token
    const account = await prisma.account.findFirst({
      where: {
        userId: user.id,
        provider: 'google'
      }
    })

    if (!account?.access_token) {
      return NextResponse.json({ error: 'No Google access token found' }, { status: 400 })
    }

    // Use default preferences if none exist
    const preferences = user.preferences || {
      earliestWorkoutTime: '06:00',
      latestWorkoutTime: '22:00',
      preferredWorkoutDuration: 30,
      timezone: 'UTC'
    }

    // Initialize calendar service
    const calendarService = new CalendarService(account.access_token)
    
    // Find available slots
    const slots = await calendarService.findAvailableSlots({
      earliestTime: preferences.earliestWorkoutTime,
      latestTime: preferences.latestWorkoutTime,
      timezone: preferences.timezone,
      preferredDuration: preferences.preferredWorkoutDuration
    })

    return NextResponse.json({ slots })
  } catch (error) {
    console.error('Error fetching calendar slots:', error)
    return NextResponse.json(
      { error: 'Failed to fetch calendar slots' },
      { status: 500 }
    )
  }
}
