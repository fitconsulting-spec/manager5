"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import type { User, LearnerData, Reflection, Habit } from "@/types"
import { ALL_SCENARIOS, ALL_DAILY_HABITS, ALL_WEEKLY_HABITS, REFLECTION_TAGS } from "@/lib/data"
import { storage, todayStr, weekKey } from "@/lib/storage"

// ── カラーパレット ──────────────────────────────────────
const C = {
  bg: "#F7F4EE", card: "#FFFFFF", ink: "#1C1A16", sub: "#7A7567",
  accent: "#D4600A", accentLight: "#FFF0E6",
  green: "#2A7A4B", greenLight: "#E8F5EE",
  blue: "#1A5C8A", blueLight: "#E6F0F8",
  border: "#E8E4DC", tag: "#F0EDE6",
}

const cardStyle: React.CSSProperties = {
  background: C.card, borderRadius: 16, border: `1px solid ${C.border}`, padding: 20, marginBottom: 14,
}

const pill = (active: boolean, color = C.accent): React.CSSProperties => ({
  display: "inline-block", padding: "3px 10px", borderRadius: 999,
  fontSize: 11, fontWeight: 600, cursor: "pointer",
  background: active ? color : C.tag, color: active ? "#fff" : C.sub,
  border: `1px solid ${active ? color : C.border}`, transition: "all 0.15s", userSelect: "none",
})

const btnStyle = (variant: "primary" | "ghost" = "primary"): React.CSSProperties => ({
  padding: "11px 24px", borderRadius: 10,
  border: variant === "ghost" ? `1px solid ${C.border}` : "none",
  cursor: "pointer", fontFamily: "'DM Sans', 'Noto Sans JP', sans-serif", fontWeight: 700, fontSize: 14,
  background: variant === "primary" ? C.accent : "transparent",
  color: variant === "primary" ? "#fff" : C.sub, transition: "opacity 0.15s",
})

const moodEmoji = (m: number) => ["", "😞", "😕", "😐", "🙂", "😄"][m]

// ── ユーザー選択画面 ──────────────────────────────────
function UserSelector({
  users, loading, onSelect,
}: { users: User[]; loading: boolean; onSelect: (u: User) => void }) {
  return (
    <div style={{ minHeight: "100vh", background: C.bg, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24, fontFamily: "'DM Sans', 'Noto Sans JP', sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Fraunces:wght@400;700&family=DM+Sans:wght@400;500;600;700&family=Noto+Sans+JP:wght@400;500;600&display=swap');`}</style>
      <div style={{ maxWidth: 400, width: "100%" }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ fontSize: 32, fontWeight: 700, fontFamily: "'Fraunces', Georgia, serif", letterSpacing: "-0.02em", color: C.ink, marginBottom: 8 }}>
            Manager<span style={{ color: C.accent }}>5</span>
          </div>
          <div style={{ fontSize: 14, color: C.sub }}>学習を始めるプロフィールを選んでください</div>
        </div>

        {loading ? (
          <div style={{ textAlign: "center", color: C.sub, padding: 32 }}>読み込み中…</div>
        ) : users.length === 0 ? (
          <div style={{ ...cardStyle, textAlign: "center", color: C.sub, fontSize: 14 }}>
            管理者がまだメンバーを登録していません。
            <br />
            <a href="/admin" style={{ color: C.accent, marginTop: 8, display: "block" }}>管理者パネルへ →</a>
          </div>
        ) : (
          users.map((u) => (
            <div key={u.id} onClick={() => onSelect(u)}
              style={{ ...cardStyle, display: "flex", alignItems: "center", gap: 16, cursor: "pointer" }}>
              <div style={{ width: 52, height: 52, borderRadius: "50%", background: u.color + "22", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, color: u.color, fontWeight: 700, flexShrink: 0 }}>
                {u.avatar}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: C.ink }}>{u.name}</div>
                <div style={{ fontSize: 12, color: C.sub, marginTop: 2 }}>{u.role}</div>
                <div style={{ fontSize: 11, color: C.accent, marginTop: 4 }}>
                  シナリオ {u.scenarios.length}件 / 日次 {u.dailyHabits.length + u.customDailyHabits.length}件 / 週次 {u.weeklyHabits.length + u.customWeeklyHabits.length}件
                </div>
              </div>
              <div style={{ fontSize: 20, color: C.sub }}>→</div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

// ── メイン学習者アプリ ────────────────────────────────
export default function LearnerApp() {
  const [users, setUsers] = useState<User[]>([])
  const [activeUser, setActiveUser] = useState<User | null>(null)
  const [learnerData, setLearnerData] = useState<LearnerData | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<"home" | "scenario" | "habit" | "reflect">("home")

  // シナリオ
  const [scenarioIdx, setScenarioIdx] = useState(0)
  const [scenarioPhase, setScenarioPhase] = useState<"read" | "result">("read")
  const [chosen, setChosen] = useState<string | null>(null)

  // 習慣
  const [habitTab, setHabitTab] = useState<"daily" | "weekly">("daily")

  // 振り返り
  const [reflectionText, setReflectionText] = useState("")
  const [reflectionMood, setReflectionMood] = useState(3)
  const [reflectionTags, setReflectionTags] = useState<string[]>([])
  const [showReflectionForm, setShowReflectionForm] = useState(false)

  // 初回ロード
  useEffect(() => {
    ;(async () => {
      try {
        const allUsers = await storage.getUsers()
        setUsers(allUsers)
        const activeId = storage.getActiveUserId()
        if (activeId) {
          const user = allUsers.find((u) => u.id === activeId)
          if (user) {
            const data = await storage.getLearnerData(user.id)
            setActiveUser(user)
            setLearnerData(data)
          }
        }
      } catch (e) {
        console.error("load error", e)
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const selectUser = useCallback(async (u: User) => {
    setLoading(true)
    try {
      storage.setActiveUserId(u.id)
      const data = await storage.getLearnerData(u.id)
      setActiveUser(u)
      setLearnerData(data)
      setTab("home")
      setScenarioIdx(0)
      setScenarioPhase("read")
      setChosen(null)
    } finally {
      setLoading(false)
    }
  }, [])

  const switchUser = useCallback(() => {
    storage.clearActiveUserId()
    setActiveUser(null)
    setLearnerData(null)
  }, [])

  // ユーザー未選択 or 初期ロード中
  if (loading && !activeUser) return (
    <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'DM Sans',sans-serif", color: C.sub }}>
      読み込み中…
    </div>
  )

  if (!activeUser || !learnerData) {
    return <UserSelector users={users} loading={loading} onSelect={selectUser} />
  }

  // ── 派生データ ─────────────────────────────────────────
  const myScenarios = ALL_SCENARIOS.filter((s) => activeUser.scenarios.includes(s.id))
  const myDailyHabits: Habit[] = [
    ...ALL_DAILY_HABITS.filter((h) => activeUser.dailyHabits.includes(h.id)),
    ...activeUser.customDailyHabits,
  ]
  const myWeeklyHabits: Habit[] = [
    ...ALL_WEEKLY_HABITS.filter((h) => activeUser.weeklyHabits.includes(h.id)),
    ...activeUser.customWeeklyHabits,
  ]

  const safeIdx = myScenarios.length > 0 ? scenarioIdx % myScenarios.length : 0
  const scenario = myScenarios[safeIdx]
  const todayDailyCount = myDailyHabits.filter((h) => learnerData.checkedDaily[h.id]).length
  const thisWeeklyCount = myWeeklyHabits.filter((h) => learnerData.checkedWeekly[h.id]).length
  const allTagCounts = learnerData.reflections
    .flatMap((r) => r.tags)
    .reduce<Record<string, number>>((a, t) => ({ ...a, [t]: (a[t] || 0) + 1 }), {})
  const topTag = Object.entries(allTagCounts).sort((a, b) => b[1] - a[1])[0]?.[0]
  const today = new Date().toLocaleDateString("ja-JP", { month: "numeric", day: "numeric" })

  // ── アクション ──────────────────────────────────────────
  const handleChoose = (id: string) => {
    if (!scenario) return
    setChosen(id)
    setScenarioPhase("result")
    // 楽観的更新 → Supabase 非同期 sync
    if (!learnerData.completedScenarios.includes(scenario.id)) {
      setLearnerData((prev) => prev ? { ...prev, completedScenarios: [...prev.completedScenarios, scenario.id] } : prev)
      storage.markScenarioComplete(activeUser.id, scenario.id).catch(console.error)
    }
  }

  const nextScenario = () => {
    setScenarioIdx((safeIdx + 1) % myScenarios.length)
    setScenarioPhase("read")
    setChosen(null)
  }

  const toggleHabit = (h: Habit, type: "daily" | "weekly") => {
    const field = type === "daily" ? "checkedDaily" : "checkedWeekly"
    const checked = !!learnerData[field][h.id]
    // 楽観的更新
    setLearnerData((prev) => prev ? { ...prev, [field]: { ...prev[field], [h.id]: !checked } } : prev)
    // Supabase sync
    if (!checked) {
      storage.checkHabit(activeUser.id, h.id, type).catch(console.error)
    } else {
      storage.uncheckHabit(activeUser.id, h.id, type).catch(console.error)
    }
  }

  const saveReflection = async () => {
    if (!reflectionText.trim()) return
    const draft = { date: todayStr(), text: reflectionText, tags: reflectionTags, mood: reflectionMood }
    // 楽観的更新（仮IDで先にUI追加）
    const tempRef: Reflection = { id: `temp_${Date.now()}`, ...draft }
    setLearnerData((prev) => prev ? { ...prev, reflections: [tempRef, ...prev.reflections] } : prev)
    setReflectionText(""); setReflectionTags([]); setReflectionMood(3); setShowReflectionForm(false)
    // Supabase sync（本IDで差し替え）
    try {
      const saved = await storage.addReflection(activeUser.id, draft)
      setLearnerData((prev) => prev ? {
        ...prev,
        reflections: prev.reflections.map((r) => r.id === tempRef.id ? saved : r),
      } : prev)
    } catch (e) {
      console.error(e)
    }
  }

  const tabBtn = (t: string): React.CSSProperties => ({
    flex: 1, padding: "10px 0", background: "none", border: "none", cursor: "pointer",
    fontSize: 11, fontWeight: 600, color: tab === t ? C.accent : C.sub,
    borderTop: tab === t ? `2px solid ${C.accent}` : "2px solid transparent",
    fontFamily: "'DM Sans', 'Noto Sans JP', sans-serif", letterSpacing: "0.04em", transition: "all 0.15s",
  })

  return (
    <div style={{ fontFamily: "'Fraunces', 'Noto Serif JP', Georgia, serif", background: C.bg, minHeight: "100vh", color: C.ink }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,wght@0,400;0,600;0,700;1,400&family=DM+Sans:wght@400;500;600;700&family=Noto+Serif+JP:wght@400;600&family=Noto+Sans+JP:wght@400;500;600&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        textarea { font-family: 'DM Sans','Noto Sans JP',sans-serif; }
        button:hover { opacity: 0.82; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: #ddd; border-radius: 2px; }
      `}</style>

      {/* Header */}
      <div style={{ background: C.card, borderBottom: `1px solid ${C.border}`, padding: "12px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 50 }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: "-0.02em", color: C.ink }}>Manager<span style={{ color: C.accent }}>5</span></div>
          <div style={{ fontSize: 10, color: C.sub, fontFamily: "'DM Sans',sans-serif", letterSpacing: "0.06em" }}>新任マネージャー成長アプリ</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, background: C.accentLight, borderRadius: 20, padding: "5px 12px" }}>
            <span style={{ fontSize: 14 }}>🔥</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: C.accent, fontFamily: "'DM Sans',sans-serif" }}>{learnerData.habitStreak}日連続</span>
          </div>
          <button onClick={switchUser}
            style={{ background: "none", border: `1px solid ${C.border}`, borderRadius: 20, padding: "5px 10px", cursor: "pointer", fontSize: 11, color: C.sub, fontFamily: "'DM Sans',sans-serif", display: "flex", alignItems: "center", gap: 4 }}>
            <span style={{ width: 20, height: 20, borderRadius: "50%", background: activeUser.color + "33", color: activeUser.color, fontSize: 10, fontWeight: 700, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
              {activeUser.avatar}
            </span>
            {activeUser.name.split(" ")[0]}
          </button>
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 480, margin: "0 auto", padding: "20px 16px 80px" }}>

        {/* ── HOME ── */}
        {tab === "home" && (
          <div>
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.02em", marginBottom: 4 }}>今日の経験を明日のマネジメント力へ 👋</div>
              <div style={{ fontSize: 14, color: C.sub, fontFamily: "'DM Sans',sans-serif" }}>管理職としての成長は日々の小さな振り返りから！迷い、気づき、挑戦を記録しよう。</div>
            </div>

            {/* Progress */}
            <div style={{ ...cardStyle, background: C.ink, color: "#fff" }}>
              <div style={{ fontSize: 11, color: "#9A9080", fontFamily: "'DM Sans',sans-serif", letterSpacing: "0.06em", marginBottom: 12 }}>今週の進捗</div>
              <div style={{ display: "flex", gap: 16, marginBottom: 14 }}>
                {[
                  { label: "シナリオ", value: learnerData.completedScenarios.filter(id => activeUser.scenarios.includes(id)).length, total: `/${myScenarios.length}`, color: "#F4874B" },
                  { label: "日次習慣", value: todayDailyCount, total: `/${myDailyHabits.length}`, color: "#5EC97E" },
                  { label: "振り返り", value: learnerData.reflections.length, total: "件", color: "#6AAFE6" },
                ].map((item) => (
                  <div key={item.label} style={{ flex: 1, textAlign: "center" }}>
                    <div style={{ fontSize: 24, fontWeight: 700, color: item.color }}>{item.value}<span style={{ fontSize: 13, color: "#6A6055" }}>{item.total}</span></div>
                    <div style={{ fontSize: 10, color: "#6A6055", fontFamily: "'DM Sans',sans-serif", marginTop: 2 }}>{item.label}</div>
                  </div>
                ))}
              </div>
              <div style={{ height: 4, background: "#2C2820", borderRadius: 2, overflow: "hidden" }}>
                <div style={{ width: `${myDailyHabits.length > 0 ? Math.round(todayDailyCount / myDailyHabits.length * 100) : 0}%`, height: "100%", background: "#5EC97E", borderRadius: 2, transition: "width 0.5s" }} />
              </div>
            </div>

            {myScenarios.length === 0 && myDailyHabits.length === 0 ? (
              <div style={{ ...cardStyle, textAlign: "center", color: C.sub, fontSize: 14, padding: 32 }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>📋</div>
                <div style={{ fontWeight: 600, marginBottom: 8, color: C.ink }}>コンテンツが設定されていません</div>
                <div style={{ fontSize: 12 }}>管理者にシナリオや習慣を割り当ててもらいましょう。</div>
              </div>
            ) : (
              <>
                <div style={{ fontSize: 12, fontWeight: 600, color: C.sub, fontFamily: "'DM Sans',sans-serif", letterSpacing: "0.06em", marginBottom: 12 }}>今日やること</div>
                {([
                  myScenarios.length > 0 && scenario ? {
                    icon: "🎬", title: "今日のシナリオ", desc: scenario.title, time: scenario.time,
                    action: () => setTab("scenario"), done: learnerData.completedScenarios.includes(scenario.id),
                    color: C.accentLight, accent: C.accent,
                  } : null,
                  myDailyHabits.length > 0 ? {
                    icon: "✅", title: "習慣チェック",
                    desc: `日次 ${todayDailyCount}/${myDailyHabits.length} / 週次 ${thisWeeklyCount}/${myWeeklyHabits.length}`,
                    time: "1分", action: () => setTab("habit"),
                    done: myDailyHabits.length > 0 && todayDailyCount === myDailyHabits.length,
                    color: C.greenLight, accent: C.green,
                  } : null,
                  {
                    icon: "📝", title: "今日の振り返り", desc: "30秒で今日を記録", time: "1分",
                    action: () => { setTab("reflect"); setShowReflectionForm(true) },
                    done: learnerData.reflections.some((r) => r.date === today),
                    color: C.blueLight, accent: C.blue,
                  },
                ] as const).filter(Boolean).map((item) => {
                  if (!item) return null
                  return (
                    <div key={item.title} onClick={item.action}
                      style={{ ...cardStyle, display: "flex", alignItems: "center", gap: 14, cursor: "pointer", opacity: item.done ? 0.6 : 1 }}>
                      <div style={{ width: 44, height: 44, borderRadius: 12, background: item.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>
                        {item.done ? "✓" : item.icon}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 2 }}>{item.title}</div>
                        <div style={{ fontSize: 12, color: C.sub, fontFamily: "'DM Sans',sans-serif" }}>{item.desc}</div>
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
                        <span style={{ fontSize: 11, color: C.sub, fontFamily: "'DM Sans',sans-serif" }}>⏱ {item.time}</span>
                        {item.done && <span style={{ fontSize: 10, color: item.accent, fontWeight: 600, fontFamily: "'DM Sans',sans-serif" }}>完了</span>}
                      </div>
                    </div>
                  )
                })}
              </>
            )}

            {topTag && (
              <div style={{ ...cardStyle, background: C.blueLight, border: `1px solid #C5DCF0` }}>
                <div style={{ fontSize: 11, color: C.blue, fontFamily: "'DM Sans',sans-serif", fontWeight: 600, letterSpacing: "0.06em", marginBottom: 8 }}>📊 あなたの傾向</div>
                <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>「{topTag}」の場面が多めです</div>
                <div style={{ fontSize: 12, color: C.sub, fontFamily: "'DM Sans',sans-serif", lineHeight: 1.6 }}>振り返りの記録から分析。今週のシナリオでこのスキルを意識して練習してみましょう。</div>
              </div>
            )}
          </div>
        )}

        {/* ── SCENARIO ── */}
        {tab === "scenario" && (
          <div>
            {myScenarios.length === 0 ? (
              <div style={{ ...cardStyle, textAlign: "center", color: C.sub, fontSize: 14, padding: 32 }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>🎬</div>
                <div style={{ fontWeight: 600, color: C.ink, marginBottom: 8 }}>シナリオが割り当てられていません</div>
              </div>
            ) : (
              <>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
                  <span style={{ ...pill(true, C.accent), fontSize: 10 }}>{scenario?.tag}</span>
                  <span style={{ fontSize: 12, color: C.sub, fontFamily: "'DM Sans',sans-serif" }}>⏱ {scenario?.time}</span>
                  <span style={{ fontSize: 12, color: C.sub, fontFamily: "'DM Sans',sans-serif", marginLeft: "auto" }}>{safeIdx + 1} / {myScenarios.length}</span>
                </div>
                <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
                  {myScenarios.map((s, i) => (
                    <div key={s.id} onClick={() => { setScenarioIdx(i); setScenarioPhase("read"); setChosen(null) }}
                      style={{ flex: 1, height: 4, borderRadius: 2, cursor: "pointer", transition: "background 0.2s",
                        background: i === safeIdx ? C.accent : learnerData.completedScenarios.includes(s.id) ? "#FADFC8" : C.border }} />
                  ))}
                </div>
                {scenario && (
                  <div style={cardStyle}>
                    <div style={{ fontSize: 19, fontWeight: 700, lineHeight: 1.45, marginBottom: 14 }}>&ldquo;{scenario.title}&rdquo;</div>
                    <div style={{ fontSize: 14, color: C.sub, lineHeight: 1.7, fontFamily: "'DM Sans','Noto Sans JP',sans-serif", background: C.bg, borderRadius: 10, padding: 14 }}>
                      {scenario.situation}
                    </div>
                  </div>
                )}
                {scenarioPhase === "read" && scenario && (
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: C.sub, fontFamily: "'DM Sans',sans-serif", marginBottom: 12 }}>あなたならどうする？</div>
                    {scenario.choices.map((c) => (
                      <div key={c.id} onClick={() => handleChoose(c.id)}
                        style={{ ...cardStyle, cursor: "pointer", display: "flex", alignItems: "flex-start", gap: 12 }}>
                        <div style={{ width: 28, height: 28, borderRadius: "50%", background: C.tag, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: C.sub, flexShrink: 0, fontFamily: "'DM Sans',sans-serif" }}>
                          {c.id.toUpperCase()}
                        </div>
                        <div style={{ fontSize: 14, lineHeight: 1.6, paddingTop: 3, fontFamily: "'DM Sans','Noto Sans JP',sans-serif" }}>{c.text}</div>
                      </div>
                    ))}
                  </div>
                )}
                {scenarioPhase === "result" && chosen && scenario && (
                  <div>
                    {scenario.choices.map((c) => {
                      const exp = scenario.explanations[c.id]
                      const isBest = c.id === scenario.best
                      const isChosen = c.id === chosen
                      return (
                        <div key={c.id} style={{ ...cardStyle, borderColor: isBest ? C.green : isChosen && !isBest ? "#E05050" : C.border, background: isBest ? C.greenLight : isChosen && !isBest ? "#FFF0F0" : C.card }}>
                          <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 8 }}>
                            <div style={{ width: 28, height: 28, borderRadius: "50%", background: isBest ? C.green : isChosen && !isBest ? "#E05050" : C.tag, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: isBest || (isChosen && !isBest) ? "#fff" : C.sub, flexShrink: 0, fontFamily: "'DM Sans',sans-serif" }}>
                              {c.id.toUpperCase()}
                            </div>
                            <div>
                              <div style={{ fontSize: 11, fontWeight: 700, color: isBest ? C.green : isChosen && !isBest ? "#C04040" : C.sub, fontFamily: "'DM Sans',sans-serif", marginBottom: 3 }}>
                                {exp?.label} {isChosen && "← あなたの選択"}
                              </div>
                              <div style={{ fontSize: 13, color: C.sub, lineHeight: 1.65, fontFamily: "'DM Sans','Noto Sans JP',sans-serif" }}>{exp?.text}</div>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                    <div style={{ ...cardStyle, background: "#FFFBF0", borderColor: "#E8D88A" }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: "#8A7A10", fontFamily: "'DM Sans',sans-serif", letterSpacing: "0.06em", marginBottom: 8 }}>💡 今日のポイント</div>
                      <div style={{ fontSize: 14, lineHeight: 1.7, fontFamily: "'DM Sans','Noto Sans JP',sans-serif" }}>{scenario.point}</div>
                    </div>
                    <button style={{ ...btnStyle("primary"), width: "100%", marginTop: 4 }} onClick={nextScenario}>次のシナリオへ →</button>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ── HABIT ── */}
        {tab === "habit" && (
          <div>
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.02em", marginBottom: 4 }}>習慣チェック</div>
              <div style={{ fontSize: 13, color: C.sub, fontFamily: "'DM Sans',sans-serif" }}>日次は毎日、週次は今週できたかを記録</div>
            </div>
            <div style={{ ...cardStyle, display: "flex", alignItems: "center", gap: 16, background: C.ink }}>
              <div style={{ fontSize: 40 }}>🔥</div>
              <div>
                <div style={{ fontSize: 28, fontWeight: 700, color: "#F4874B" }}>{learnerData.habitStreak}日</div>
                <div style={{ fontSize: 12, color: "#6A6055", fontFamily: "'DM Sans',sans-serif" }}>継続中ストリーク</div>
              </div>
              <div style={{ marginLeft: "auto", display: "flex", gap: 12 }}>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 18, fontWeight: 700, color: "#5EC97E" }}>{todayDailyCount}/{myDailyHabits.length}</div>
                  <div style={{ fontSize: 10, color: "#6A6055", fontFamily: "'DM Sans',sans-serif" }}>日次</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 18, fontWeight: 700, color: "#6AAFE6" }}>{thisWeeklyCount}/{myWeeklyHabits.length}</div>
                  <div style={{ fontSize: 10, color: "#6A6055", fontFamily: "'DM Sans',sans-serif" }}>週次</div>
                </div>
              </div>
            </div>

            <div style={{ display: "flex", background: C.tag, borderRadius: 10, padding: 3, marginBottom: 20 }}>
              {([ ["daily", "📅 日次習慣"], ["weekly", "📆 週次習慣"] ] as const).map(([key, label]) => (
                <button key={key} onClick={() => setHabitTab(key)}
                  style={{ flex: 1, padding: "8px 0", border: "none", borderRadius: 8, cursor: "pointer", fontFamily: "'DM Sans','Noto Sans JP',sans-serif", fontSize: 13, fontWeight: 700, background: habitTab === key ? C.card : "transparent", color: habitTab === key ? C.ink : C.sub, boxShadow: habitTab === key ? "0 1px 4px #0001" : "none", transition: "all 0.18s" }}>
                  {label}
                </button>
              ))}
            </div>

            {/* 日次 */}
            {habitTab === "daily" && (
              <div>
                {myDailyHabits.length === 0 ? (
                  <div style={{ ...cardStyle, textAlign: "center", color: C.sub, fontSize: 13, padding: 24 }}>日次習慣が設定されていません</div>
                ) : (
                  <>
                    <div style={{ ...cardStyle, background: C.greenLight, borderColor: "#B8DFC8", marginBottom: 16 }}>
                      <div style={{ fontSize: 11, color: C.green, fontWeight: 700, fontFamily: "'DM Sans',sans-serif", letterSpacing: "0.06em", marginBottom: 6 }}>📅 日次チェック</div>
                      <div style={{ height: 4, background: "#C8E8D4", borderRadius: 2, overflow: "hidden", marginTop: 10 }}>
                        <div style={{ width: `${Math.round(todayDailyCount / myDailyHabits.length * 100)}%`, height: "100%", background: C.green, borderRadius: 2, transition: "width 0.5s" }} />
                      </div>
                      <div style={{ fontSize: 11, color: C.green, fontFamily: "'DM Sans',sans-serif", marginTop: 4, textAlign: "right", fontWeight: 600 }}>{todayDailyCount}/{myDailyHabits.length} 完了</div>
                    </div>
                    {myDailyHabits.map((h) => {
                      const checked = !!learnerData.checkedDaily[h.id]
                      return (
                        <div key={h.id} onClick={() => toggleHabit(h, "daily")}
                          style={{ ...cardStyle, display: "flex", alignItems: "center", gap: 12, cursor: "pointer", marginBottom: 10, borderColor: checked ? C.green : C.border, background: checked ? C.greenLight : C.card, transition: "all 0.2s" }}>
                          <div style={{ width: 42, height: 42, borderRadius: 12, background: checked ? C.green : C.tag, display: "flex", alignItems: "center", justifyContent: "center", fontSize: checked ? 18 : 20, flexShrink: 0, transition: "background 0.2s" }}>
                            {checked ? "✓" : h.icon}
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 14, fontFamily: "'DM Sans','Noto Sans JP',sans-serif", lineHeight: 1.4, textDecoration: checked ? "line-through" : "none", color: checked ? C.sub : C.ink }}>
                              {h.label}
                            </div>
                            <div style={{ fontSize: 10, color: C.sub, fontFamily: "'DM Sans',sans-serif", marginTop: 2 }}>{h.category}</div>
                          </div>
                        </div>
                      )
                    })}
                  </>
                )}
              </div>
            )}

            {/* 週次 */}
            {habitTab === "weekly" && (
              <div>
                {myWeeklyHabits.length === 0 ? (
                  <div style={{ ...cardStyle, textAlign: "center", color: C.sub, fontSize: 13, padding: 24 }}>週次習慣が設定されていません</div>
                ) : (
                  <>
                    <div style={{ ...cardStyle, background: C.blueLight, borderColor: "#C5DCF0", marginBottom: 16 }}>
                      <div style={{ fontSize: 11, color: C.blue, fontWeight: 700, fontFamily: "'DM Sans',sans-serif", letterSpacing: "0.06em", marginBottom: 6 }}>📆 週次チェック</div>
                      <div style={{ height: 4, background: "#C5DCF0", borderRadius: 2, overflow: "hidden", marginTop: 10 }}>
                        <div style={{ width: `${Math.round(thisWeeklyCount / myWeeklyHabits.length * 100)}%`, height: "100%", background: C.blue, borderRadius: 2, transition: "width 0.5s" }} />
                      </div>
                      <div style={{ fontSize: 11, color: C.blue, fontFamily: "'DM Sans',sans-serif", marginTop: 4, textAlign: "right", fontWeight: 600 }}>{thisWeeklyCount}/{myWeeklyHabits.length} 完了</div>
                    </div>
                    {myWeeklyHabits.map((h) => {
                      const checked = !!learnerData.checkedWeekly[h.id]
                      return (
                        <div key={h.id} onClick={() => toggleHabit(h, "weekly")}
                          style={{ ...cardStyle, display: "flex", alignItems: "center", gap: 12, cursor: "pointer", marginBottom: 10, borderColor: checked ? C.blue : C.border, background: checked ? C.blueLight : C.card, transition: "all 0.2s" }}>
                          <div style={{ width: 42, height: 42, borderRadius: 12, background: checked ? C.blue : C.tag, display: "flex", alignItems: "center", justifyContent: "center", fontSize: checked ? 18 : 20, flexShrink: 0, transition: "background 0.2s", color: checked ? "#fff" : "inherit" }}>
                            {checked ? "✓" : h.icon}
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 14, fontFamily: "'DM Sans','Noto Sans JP',sans-serif", lineHeight: 1.4, textDecoration: checked ? "line-through" : "none", color: checked ? C.sub : C.ink }}>{h.label}</div>
                            <div style={{ fontSize: 10, color: C.blue, fontFamily: "'DM Sans',sans-serif", marginTop: 2, fontWeight: 600 }}>週1回 · {h.category}</div>
                          </div>
                        </div>
                      )
                    })}
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── REFLECT ── */}
        {tab === "reflect" && (
          <div>
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.02em", marginBottom: 4 }}>振り返り</div>
              <div style={{ fontSize: 13, color: C.sub, fontFamily: "'DM Sans',sans-serif" }}>今日のマネジメント場面を記録しよう</div>
            </div>
            {!showReflectionForm && (
              <button style={{ ...btnStyle("primary"), width: "100%", marginBottom: 16 }} onClick={() => setShowReflectionForm(true)}>
                + 今日の振り返りを書く
              </button>
            )}
            {showReflectionForm && (
              <div style={{ ...cardStyle, borderColor: C.accent }}>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>今日のマネジメント場面</div>
                <textarea value={reflectionText} onChange={(e) => setReflectionText(e.target.value)}
                  placeholder="例：田中さんへのフィードバックがうまくできなかった。次回は具体的な行動を伝えるようにしたい。"
                  style={{ width: "100%", minHeight: 100, background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, padding: 12, fontSize: 14, lineHeight: 1.65, outline: "none", resize: "vertical", color: C.ink, boxSizing: "border-box" }} />
                <div style={{ fontSize: 12, fontWeight: 600, color: C.sub, fontFamily: "'DM Sans',sans-serif", margin: "14px 0 8px" }}>今日の気分</div>
                <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
                  {[1, 2, 3, 4, 5].map((m) => (
                    <div key={m} onClick={() => setReflectionMood(m)}
                      style={{ flex: 1, textAlign: "center", padding: "8px 0", borderRadius: 10, cursor: "pointer", background: reflectionMood === m ? C.accentLight : C.tag, border: `1px solid ${reflectionMood === m ? C.accent : C.border}`, transition: "all 0.15s" }}>
                      <div style={{ fontSize: 20 }}>{moodEmoji(m)}</div>
                    </div>
                  ))}
                </div>
                <div style={{ fontSize: 12, fontWeight: 600, color: C.sub, fontFamily: "'DM Sans',sans-serif", marginBottom: 8 }}>関連するスキル</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 16 }}>
                  {REFLECTION_TAGS.map((t) => (
                    <span key={t} onClick={() => setReflectionTags((p) => p.includes(t) ? p.filter((x) => x !== t) : [...p, t])}
                      style={{ ...pill(reflectionTags.includes(t)), cursor: "pointer" }}>{t}</span>
                  ))}
                </div>
                <div style={{ display: "flex", gap: 10 }}>
                  <button style={{ ...btnStyle("primary"), flex: 1 }} onClick={saveReflection}>保存する</button>
                  <button style={{ ...btnStyle("ghost"), flex: 1 }} onClick={() => setShowReflectionForm(false)}>キャンセル</button>
                </div>
              </div>
            )}
            {learnerData.reflections.length >= 2 && (
              <div style={{ ...cardStyle, background: C.blueLight, borderColor: "#C5DCF0", marginBottom: 4 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: C.blue, fontFamily: "'DM Sans',sans-serif", letterSpacing: "0.06em", marginBottom: 8 }}>📊 あなたの傾向分析</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
                  {Object.entries(allTagCounts).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([tag, count]) => (
                    <span key={tag} style={{ ...pill(true, C.blue), fontSize: 11 }}>{tag} {count}回</span>
                  ))}
                </div>
                <div style={{ fontSize: 12, color: C.sub, fontFamily: "'DM Sans',sans-serif", lineHeight: 1.6 }}>「{topTag}」に関する場面が最も多く記録されています。</div>
              </div>
            )}
            <div style={{ fontSize: 11, fontWeight: 600, color: C.sub, fontFamily: "'DM Sans',sans-serif", letterSpacing: "0.06em", margin: "16px 0 10px" }}>過去の記録</div>
            {learnerData.reflections.length === 0 && (
              <div style={{ ...cardStyle, textAlign: "center", color: C.sub, fontSize: 13, padding: 24 }}>まだ振り返りがありません</div>
            )}
            {learnerData.reflections.map((r) => (
              <div key={r.id} style={cardStyle}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {r.tags.map((t) => <span key={t} style={{ ...pill(false), fontSize: 10 }}>{t}</span>)}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                    <span style={{ fontSize: 16 }}>{moodEmoji(r.mood)}</span>
                    <span style={{ fontSize: 11, color: C.sub, fontFamily: "'DM Sans',sans-serif" }}>{r.date}</span>
                  </div>
                </div>
                <div style={{ fontSize: 14, lineHeight: 1.7, color: C.sub, fontFamily: "'DM Sans','Noto Sans JP',sans-serif" }}>{r.text}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bottom Nav */}
      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: C.card, borderTop: `1px solid ${C.border}`, display: "flex", zIndex: 50 }}>
        {([ ["home", "🏠", "ホーム"], ["scenario", "🎬", "シナリオ"], ["habit", "✅", "習慣"], ["reflect", "📝", "振り返り"] ] as const).map(([t, icon, label]) => (
          <button key={t} style={tabBtn(t)} onClick={() => setTab(t)}>
            <div style={{ fontSize: 20, marginBottom: 2 }}>{icon}</div>
            <div>{label}</div>
          </button>
        ))}
      </div>
    </div>
  )
}
