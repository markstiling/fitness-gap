import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const session = await getServerSession()
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: { preferences: true }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Return default preferences if none exist
    const preferences = user.preferences || {
      earliestWorkoutTime: '06:00',
      latestWorkoutTime: '22:00',
      preferredWorkoutDuration: 30,
      timezone: 'UTC'
    }

    return NextResponse.json(preferences)
  } catch (error) {
    console.error('Error fetching preferences:', error)
    return NextResponse.json(
      { error: 'Failed to fetch preferences' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession()
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const preferences = await request.json()

    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Upsert user preferences
    await prisma.userPreferences.upsert({
      where: { userId: user.id },
      update: {
        earliestWorkoutTime: preferences.earliestWorkoutTime,
        latestWorkoutTime: preferences.latestWorkoutTime,
        preferredWorkoutDuration: preferences.preferredWorkoutDuration,
        timezone: preferences.timezone,
      },
      create: {
        userId: user.id,
        earliestWorkoutTime: preferences.earliestWorkoutTime,
        latestWorkoutTime: preferences.latestWorkoutTime,
        preferredWorkoutDuration: preferences.preferredWorkoutDuration,
        timezone: preferences.timezone,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error saving preferences:', error)
    return NextResponse.json(
      { error: 'Failed to save preferences' },
      { status: 500 }
    )
  }
}
