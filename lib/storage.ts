import { supabase } from "./supabase"
import type { User, LearnerData, Reflection, Habit } from "@/types"

// ── 日付ユーティリティ ──────────────────────────────────
export function todayStr() {
  return new Date().toISOString().slice(0, 10) // "YYYY-MM-DD"
}

export function weekKey() {
  const d = new Date()
  const jan1 = new Date(d.getFullYear(), 0, 1)
  const week = Math.ceil(((d.getTime() - jan1.getTime()) / 86400000 + jan1.getDay() + 1) / 7)
  return `${d.getFullYear()}-W${week}`
}

// 週次習慣ログの log_date として週の月曜日を使用（週に1レコード保証）
function weekMondayStr() {
  const d = new Date()
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  const monday = new Date(d)
  monday.setDate(d.getDate() + diff)
  return monday.toISOString().slice(0, 10)
}

// カスタム習慣のIDはUUID。マスター習慣のIDは短い文字列（"listen"等）
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const isUUID = (s: string) => UUID_RE.test(s)

// ── DB行 → アプリ型マッピング ───────────────────────────
type DbUserRow = {
  id: string
  name: string
  role: string
  avatar: string
  color: string
  weakness: string
  streak_count: number
  user_scenarios: Array<{ scenario_id: number }> | null
  user_habits: Array<{
    id: string
    habit_id: string | null
    icon: string | null
    label: string | null
    category: string | null
    type: string
    is_custom: boolean
  }> | null
}

function mapUser(row: DbUserRow): User {
  const uh = row.user_habits ?? []
  return {
    id: row.id,
    name: row.name,
    role: row.role,
    avatar: row.avatar,
    color: row.color,
    weakness: row.weakness,
    scenarios: (row.user_scenarios ?? []).map((s) => s.scenario_id),
    dailyHabits: uh.filter((h) => h.type === "daily" && !h.is_custom).map((h) => h.habit_id!),
    weeklyHabits: uh.filter((h) => h.type === "weekly" && !h.is_custom).map((h) => h.habit_id!),
    customDailyHabits: uh
      .filter((h) => h.type === "daily" && h.is_custom)
      .map((h) => ({ id: h.id, icon: h.icon!, label: h.label!, category: h.category! })),
    customWeeklyHabits: uh
      .filter((h) => h.type === "weekly" && h.is_custom)
      .map((h) => ({ id: h.id, icon: h.icon!, label: h.label!, category: h.category! })),
    streak: row.streak_count,
  }
}

// ── ストレージ ─────────────────────────────────────────
export const storage = {

  // ── セッション状態（localStorage のみ） ──────────────
  getActiveUserId(): string | null {
    if (typeof window === "undefined") return null
    return localStorage.getItem("m5_active_user")
  },
  setActiveUserId(id: string): void {
    if (typeof window === "undefined") return
    localStorage.setItem("m5_active_user", id)
  },
  clearActiveUserId(): void {
    if (typeof window === "undefined") return
    localStorage.removeItem("m5_active_user")
  },

  // ── ユーザー一覧 ──────────────────────────────────────
  async getUsers(): Promise<User[]> {
    const { data, error } = await supabase
      .from("users")
      .select("*, user_scenarios(scenario_id), user_habits(id, habit_id, icon, label, category, type, is_custom)")
      .order("created_at")
    if (error) throw error
    return (data ?? []).map(mapUser)
  },

  // ── ユーザー追加 ──────────────────────────────────────
  async addUser(
    draft: Pick<User, "name" | "role" | "avatar" | "color" | "weakness">
  ): Promise<User> {
    const { data, error } = await supabase
      .from("users")
      .insert(draft)
      .select("*, user_scenarios(scenario_id), user_habits(id, habit_id, icon, label, category, type, is_custom)")
      .single()
    if (error) throw error
    return mapUser(data as DbUserRow)
  },

  // ── ユーザー情報更新 ──────────────────────────────────
  async updateUserInfo(id: string, patch: Partial<Pick<User, "name" | "role" | "weakness">>): Promise<void> {
    const { error } = await supabase.from("users").update(patch).eq("id", id)
    if (error) throw error
  },

  // ── シナリオ割り当てトグル ────────────────────────────
  async assignScenario(userId: string, scenarioId: number): Promise<void> {
    const { error } = await supabase
      .from("user_scenarios")
      .insert({ user_id: userId, scenario_id: scenarioId })
    // 23505 = unique violation（重複割り当て）は無視
    if (error && error.code !== "23505") throw error
  },

  async removeScenario(userId: string, scenarioId: number): Promise<void> {
    const { error } = await supabase
      .from("user_scenarios")
      .delete()
      .eq("user_id", userId)
      .eq("scenario_id", scenarioId)
    if (error) throw error
  },

  // ── マスター習慣の割り当てトグル ──────────────────────
  async assignHabit(userId: string, habitId: string, type: "daily" | "weekly"): Promise<void> {
    // 重複チェック（unique constraint がない場合の保護）
    const { data: existing } = await supabase
      .from("user_habits")
      .select("id")
      .eq("user_id", userId)
      .eq("habit_id", habitId)
      .eq("type", type)
      .maybeSingle()
    if (existing) return

    const { error } = await supabase
      .from("user_habits")
      .insert({ user_id: userId, habit_id: habitId, type, is_custom: false })
    if (error) throw error
  },

  async removeHabit(userId: string, habitId: string, type: "daily" | "weekly"): Promise<void> {
    const { error } = await supabase
      .from("user_habits")
      .delete()
      .eq("user_id", userId)
      .eq("habit_id", habitId)
      .eq("type", type)
    if (error) throw error
  },

  // ── カスタム習慣 ──────────────────────────────────────
  async addCustomHabit(
    userId: string,
    habit: Omit<Habit, "id"> & { type: "daily" | "weekly" }
  ): Promise<Habit> {
    const { data, error } = await supabase
      .from("user_habits")
      .insert({ user_id: userId, type: habit.type, is_custom: true, icon: habit.icon, label: habit.label, category: habit.category })
      .select("id, icon, label, category")
      .single()
    if (error) throw error
    return { id: data.id, icon: data.icon!, label: data.label!, category: data.category! }
  },

  async removeCustomHabit(userHabitId: string): Promise<void> {
    const { error } = await supabase.from("user_habits").delete().eq("id", userHabitId)
    if (error) throw error
  },

  // ── 学習者データ取得 ──────────────────────────────────
  async getLearnerData(userId: string): Promise<LearnerData> {
    const today = todayStr()
    const monday = weekMondayStr()
    const wk = weekKey()

    const [scenariosRes, userHabitsRes, logsRes, reflRes, userRes] = await Promise.all([
      supabase.from("user_scenarios").select("scenario_id").eq("user_id", userId).eq("completed", true),
      supabase.from("user_habits").select("id, habit_id, type, is_custom").eq("user_id", userId),
      supabase.from("habit_logs").select("user_habit_id, log_date").eq("user_id", userId).gte("log_date", monday),
      supabase.from("reflections").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
      supabase.from("users").select("streak_count").eq("id", userId).single(),
    ])

    const userHabits = userHabitsRes.data ?? []
    const checkedDaily: Record<string, boolean> = {}
    const checkedWeekly: Record<string, boolean> = {}

    for (const log of logsRes.data ?? []) {
      const uh = userHabits.find((h) => h.id === log.user_habit_id)
      if (!uh) continue
      // マスター習慣は habit_id をキーに、カスタム習慣は user_habit.id をキーにする
      const key = uh.is_custom ? uh.id : uh.habit_id!
      if (uh.type === "daily" && log.log_date === today) checkedDaily[key] = true
      if (uh.type === "weekly") checkedWeekly[key] = true
    }

    return {
      completedScenarios: (scenariosRes.data ?? []).map((s) => s.scenario_id),
      checkedDailyDate: today,
      checkedDaily,
      checkedWeeklyKey: wk,
      checkedWeekly,
      reflections: (reflRes.data ?? []).map((r) => ({
        id: r.id,
        date: r.reflected_at,
        text: r.text,
        tags: r.tags as string[],
        mood: r.mood,
      })),
      habitStreak: userRes.data?.streak_count ?? 0,
    }
  },

  // ── シナリオ完了 ──────────────────────────────────────
  async markScenarioComplete(userId: string, scenarioId: number): Promise<void> {
    const { error } = await supabase
      .from("user_scenarios")
      .update({ completed: true, completed_at: new Date().toISOString() })
      .eq("user_id", userId)
      .eq("scenario_id", scenarioId)
    if (error) throw error
  },

  // ── 習慣チェック ─────────────────────────────────────
  // habitKey: マスター習慣は habit_id（"listen"等）、カスタムは user_habit_id（UUID）
  async checkHabit(userId: string, habitKey: string, type: "daily" | "weekly"): Promise<void> {
    const logDate = type === "daily" ? todayStr() : weekMondayStr()
    const userHabitId = await resolveUserHabitId(userId, habitKey, type)

    const { error } = await supabase.from("habit_logs").upsert(
      { user_id: userId, user_habit_id: userHabitId, log_date: logDate },
      { onConflict: "user_habit_id,log_date" }
    )
    if (error) throw error
  },

  async uncheckHabit(userId: string, habitKey: string, type: "daily" | "weekly"): Promise<void> {
    const logDate = type === "daily" ? todayStr() : weekMondayStr()
    const userHabitId = await resolveUserHabitId(userId, habitKey, type)

    const { error } = await supabase
      .from("habit_logs")
      .delete()
      .eq("user_habit_id", userHabitId)
      .eq("log_date", logDate)
    if (error) throw error
  },

  // ── 振り返り追加 ──────────────────────────────────────
  async addReflection(userId: string, draft: Omit<Reflection, "id">): Promise<Reflection> {
    const { data, error } = await supabase
      .from("reflections")
      .insert({ user_id: userId, text: draft.text, mood: draft.mood, tags: draft.tags, reflected_at: draft.date })
      .select("id, reflected_at, text, tags, mood")
      .single()
    if (error) throw error
    return { id: data.id, date: data.reflected_at, text: data.text, tags: data.tags as string[], mood: data.mood }
  },

  // ── ストリーク更新 ────────────────────────────────────
  async updateStreak(userId: string, count: number): Promise<void> {
    const { error } = await supabase
      .from("users")
      .update({ streak_count: count, last_checked_date: todayStr() })
      .eq("id", userId)
    if (error) throw error
  },

  // ── 管理者パネル用 全ユーザー集計 ────────────────────
  async getAdminStats(): Promise<Record<string, { completedScenarios: number; checkedToday: number; reflectionCount: number }>> {
    const today = todayStr()
    const [scenariosRes, logsRes, reflRes] = await Promise.all([
      supabase.from("user_scenarios").select("user_id, completed"),
      supabase.from("habit_logs").select("user_id").eq("log_date", today),
      supabase.from("reflections").select("user_id"),
    ])

    const stats: Record<string, { completedScenarios: number; checkedToday: number; reflectionCount: number }> = {}
    const ensure = (id: string) => {
      if (!stats[id]) stats[id] = { completedScenarios: 0, checkedToday: 0, reflectionCount: 0 }
    }

    for (const row of scenariosRes.data ?? []) {
      ensure(row.user_id)
      if (row.completed) stats[row.user_id].completedScenarios++
    }
    for (const row of logsRes.data ?? []) {
      ensure(row.user_id)
      stats[row.user_id].checkedToday++
    }
    for (const row of reflRes.data ?? []) {
      ensure(row.user_id)
      stats[row.user_id].reflectionCount++
    }

    return stats
  },
}

// ── 内部ヘルパー: habitKey → user_habit_id の解決 ────────
async function resolveUserHabitId(userId: string, habitKey: string, type: "daily" | "weekly"): Promise<string> {
  if (isUUID(habitKey)) return habitKey  // カスタム習慣はすでに user_habit_id

  const { data, error } = await supabase
    .from("user_habits")
    .select("id")
    .eq("user_id", userId)
    .eq("habit_id", habitKey)
    .eq("type", type)
    .single()
  if (error) throw error
  return data.id
}
