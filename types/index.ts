export interface Choice {
  id: string
  text: string
}

export interface Explanation {
  label: string
  text: string
}

export interface Scenario {
  id: number
  tag: string
  time: string
  title: string
  difficulty: string
  situation: string
  choices: Choice[]
  best: string
  explanations: Record<string, Explanation>
  point: string
}

export interface Habit {
  id: string
  icon: string
  label: string
  category: string
}

export interface User {
  id: string           // UUID (Supabase)
  name: string
  role: string
  avatar: string
  color: string
  weakness: string
  scenarios: number[]
  dailyHabits: string[]
  weeklyHabits: string[]
  customDailyHabits: Habit[]
  customWeeklyHabits: Habit[]
}

export interface Reflection {
  id: string           // UUID (Supabase)
  date: string
  text: string
  tags: string[]
  mood: number
}

export interface LearnerData {
  completedScenarios: number[]
  checkedDailyDate: string
  checkedDaily: Record<string, boolean>
  checkedWeeklyKey: string
  checkedWeekly: Record<string, boolean>
  reflections: Reflection[]
  habitStreak: number
}
