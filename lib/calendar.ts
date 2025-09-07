import { google } from 'googleapis'
import { OAuth2Client } from 'google-auth-library'

export interface TimeSlot {
  start: Date
  end: Date
  duration: number // in minutes
}

export interface CalendarConfig {
  earliestTime: string // HH:MM format
  latestTime: string // HH:MM format
  timezone: string
  preferredDuration: number // 15 or 30 minutes
}

export class CalendarService {
  private oauth2Client: OAuth2Client
  private calendar: ReturnType<typeof google.calendar>

  constructor(accessToken: string) {
    this.oauth2Client = new google.auth.OAuth2()
    this.oauth2Client.setCredentials({ access_token: accessToken })
    this.calendar = google.calendar({ version: 'v3', auth: this.oauth2Client })
  }

  async findAvailableSlots(
    config: CalendarConfig,
    daysToCheck: number = 7
  ): Promise<TimeSlot[]> {
    const availableSlots: TimeSlot[] = []
    const now = new Date()
    
    for (let i = 0; i < daysToCheck; i++) {
      const date = new Date(now)
      date.setDate(date.getDate() + i)
      
      const slots = await this.findSlotsForDay(date, config)
      availableSlots.push(...slots)
    }

    return availableSlots
  }

  private async findSlotsForDay(
    date: Date,
    config: CalendarConfig
  ): Promise<TimeSlot[]> {
    const startOfDay = new Date(date)
    startOfDay.setHours(parseInt(config.earliestTime.split(':')[0]), parseInt(config.earliestTime.split(':')[1]), 0, 0)

    const endOfDay = new Date(date)
    endOfDay.setHours(parseInt(config.latestTime.split(':')[0]), parseInt(config.latestTime.split(':')[1]), 0, 0)

    try {
      const response = await this.calendar.freebusy.query({
        requestBody: {
          timeMin: startOfDay.toISOString(),
          timeMax: endOfDay.toISOString(),
          timeZone: config.timezone,
          items: [{ id: 'primary' }],
        },
      })

      const busyTimes = response.data.calendars?.primary?.busy || []
      const availableSlots: TimeSlot[] = []

      // Find gaps between busy times
      let currentTime = new Date(startOfDay)
      
      for (const busyPeriod of busyTimes) {
        const busyStart = new Date(busyPeriod.start!)
        const busyEnd = new Date(busyPeriod.end!)

        // Check if there's a gap before this busy period
        if (currentTime < busyStart) {
          const gapDuration = (busyStart.getTime() - currentTime.getTime()) / (1000 * 60)
          
          if (gapDuration >= config.preferredDuration) {
            availableSlots.push({
              start: new Date(currentTime),
              end: new Date(currentTime.getTime() + config.preferredDuration * 60 * 1000),
              duration: config.preferredDuration,
            })
          }
        }

        currentTime = new Date(Math.max(currentTime.getTime(), busyEnd.getTime()))
      }

      // Check for gap after last busy period
      if (currentTime < endOfDay) {
        const remainingDuration = (endOfDay.getTime() - currentTime.getTime()) / (1000 * 60)
        
        if (remainingDuration >= config.preferredDuration) {
          availableSlots.push({
            start: new Date(currentTime),
            end: new Date(currentTime.getTime() + config.preferredDuration * 60 * 1000),
            duration: config.preferredDuration,
          })
        }
      }

      return availableSlots
    } catch (error) {
      console.error('Error fetching calendar data:', error)
      return []
    }
  }

  async scheduleWorkout(slot: TimeSlot, title: string = 'Workout'): Promise<boolean> {
    try {
      await this.calendar.events.insert({
        calendarId: 'primary',
        requestBody: {
          summary: title,
          start: {
            dateTime: slot.start.toISOString(),
            timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          },
          end: {
            dateTime: slot.end.toISOString(),
            timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          },
          description: `Scheduled workout for ${slot.duration} minutes`,
        },
      })
      return true
    } catch (error) {
      console.error('Error scheduling workout:', error)
      return false
    }
  }
}
