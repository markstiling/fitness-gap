import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { CalendarService } from '@/lib/calendar'

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

    // Get user's Google account with access token
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const account = await prisma.account.findFirst({
      where: {
        userId: user.id,
        provider: 'google'
      }
    })

    if (!account?.access_token) {
      return NextResponse.json({ error: 'No Google access token found' }, { status: 400 })
    }

    // Initialize calendar service
    const calendarService = new CalendarService(account.access_token)
    
    // Schedule the workout
    const success = await calendarService.scheduleWorkout({
      start: new Date(start),
      end: new Date(end),
      duration
    })

    if (!success) {
      return NextResponse.json({ error: 'Failed to schedule workout' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error scheduling workout:', error)
    return NextResponse.json(
      { error: 'Failed to schedule workout' },
      { status: 500 }
    )
  }
}
