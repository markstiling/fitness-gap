'use client'

import { useState } from 'react'
import { Check, Dumbbell, Heart, Brain } from 'lucide-react'

interface OnboardingProps {
  onComplete: (preferences: {
    workouts: boolean
    stretching: boolean
    meditation: boolean
  }) => void
}

export default function Onboarding({ onComplete }: OnboardingProps) {
  const [selectedActivities, setSelectedActivities] = useState({
    workouts: false,
    stretching: false,
    meditation: false
  })

  const activities = [
    {
      id: 'workouts' as const,
      title: 'Workouts',
      description: 'Squeeze in a quick workout',
      icon: Dumbbell,
      color: 'bg-blue-500',
      textColor: 'text-blue-600',
      borderColor: 'border-blue-200'
    },
    {
      id: 'stretching' as const,
      title: 'Stretching',
      description: 'Short times to stretch and move',
      icon: Heart,
      color: 'bg-amber-500',
      textColor: 'text-amber-600',
      borderColor: 'border-amber-200'
    },
    {
      id: 'meditation' as const,
      title: 'Meditation',
      description: '5-min breathing and meditation breaks',
      icon: Brain,
      color: 'bg-purple-500',
      textColor: 'text-purple-600',
      borderColor: 'border-purple-200'
    }
  ]

  const toggleActivity = (activityId: keyof typeof selectedActivities) => {
    setSelectedActivities(prev => ({
      ...prev,
      [activityId]: !prev[activityId]
    }))
  }

  const handleComplete = () => {
    onComplete(selectedActivities)
  }

  const hasSelection = Object.values(selectedActivities).some(Boolean)

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              Welcome to FitnessGap! 🎉
            </h1>
            <p className="text-lg text-gray-600">
              Let's personalize your wellness experience. What activities would you like to schedule?
            </p>
          </div>

          <div className="space-y-4 mb-8">
            {activities.map((activity) => {
              const Icon = activity.icon
              const isSelected = selectedActivities[activity.id]
              
              return (
                <button
                  key={activity.id}
                  onClick={() => toggleActivity(activity.id)}
                  className={`w-full p-6 rounded-xl border-2 transition-all duration-300 hover:scale-105 transform ${
                    isSelected
                      ? `${activity.borderColor} ${activity.color} text-white shadow-xl scale-105 ring-2 ring-white ring-opacity-30`
                      : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-md'
                  }`}
                >
                  <div className="flex items-center space-x-4">
                    <div className={`p-3 rounded-lg transition-all duration-300 ${
                      isSelected 
                        ? 'bg-gray-100 scale-110' 
                        : `${activity.color} hover:scale-105`
                    }`}>
                      {isSelected ? (
                        <span className="text-2xl transition-all duration-300 drop-shadow-sm">
                          {activity.id === 'workouts' && '💪'}
                          {activity.id === 'stretching' && '🧘‍♀️'}
                          {activity.id === 'meditation' && '🧠'}
                        </span>
                      ) : (
                        <Icon className={`w-6 h-6 transition-all duration-300 text-white`} />
                      )}
                    </div>
                    <div className="flex-1 text-left">
                      <h3 className={`text-xl font-semibold ${
                        isSelected ? 'text-white' : 'text-gray-900'
                      }`}>
                        {activity.title}
                      </h3>
                      <p className={`${
                        isSelected ? 'text-white text-opacity-90' : 'text-gray-600'
                      }`}>
                        {activity.description}
                      </p>
                    </div>
                    <div className={`p-2 rounded-full transition-all duration-300 ${
                      isSelected 
                        ? 'bg-white bg-opacity-25 scale-110' 
                        : 'bg-gray-100 hover:bg-gray-200'
                    }`}>
                      <Check className={`w-5 h-5 transition-all duration-300 ${
                        isSelected 
                          ? 'text-green-500 drop-shadow-sm scale-110' 
                          : 'text-gray-400'
                      }`} />
                    </div>
                  </div>
                </button>
              )
            })}
          </div>

          <div className="text-center">
            <button
              onClick={handleComplete}
              disabled={!hasSelection}
              className={`px-8 py-4 rounded-xl font-semibold text-lg transition-all duration-200 ${
                hasSelection
                  ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:from-blue-600 hover:to-purple-700 shadow-lg hover:shadow-xl transform hover:scale-105'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
            >
              {hasSelection ? 'Get Started! 🚀' : 'Select at least one activity'}
            </button>
          </div>

          <p className="text-center text-sm text-gray-500 mt-4">
            You can always change these preferences later in settings
          </p>
        </div>
      </div>
    </div>
  )
}
