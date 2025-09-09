import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]/route'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Return default preferences for demo
    const preferences = {
      hasCompletedOnboarding: false,
      activityPreferences: {
        workouts: true,
        stretching: false,
        meditation: false
      },
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
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const preferences = await request.json()

    // For demo purposes, just return success
    // In a real app, you'd save these to a database
    return NextResponse.json({ 
      success: true,
      message: 'Preferences saved (demo mode)' 
    })
  } catch (error) {
    console.error('Error saving preferences:', error)
    return NextResponse.json(
      { error: 'Failed to save preferences' },
      { status: 500 }
    )
  }
}
