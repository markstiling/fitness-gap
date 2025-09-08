import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'

export async function POST() {
  try {
    const session = await getServerSession()
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // For now, return mock data - calendar integration will be added later
    const mockSlots = [
      {
        start: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(), // 2 hours from now
        end: new Date(Date.now() + 2.5 * 60 * 60 * 1000).toISOString(), // 2.5 hours from now
        duration: 30
      },
      {
        start: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(), // 4 hours from now
        end: new Date(Date.now() + 4.5 * 60 * 60 * 1000).toISOString(), // 4.5 hours from now
        duration: 30
      }
    ]

    return NextResponse.json({ 
      slots: mockSlots,
      message: 'Demo calendar slots (calendar integration coming soon)' 
    })
  } catch (error) {
    console.error('Error fetching calendar slots:', error)
    return NextResponse.json(
      { error: 'Failed to fetch calendar slots' },
      { status: 500 }
    )
  }
}
