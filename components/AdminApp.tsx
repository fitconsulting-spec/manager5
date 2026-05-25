"use client"

import { useState, useEffect } from "react"
import type { User } from "@/types"
import { ALL_SCENARIOS, ALL_DAILY_HABITS, ALL_WEEKLY_HABITS, DIFFICULTY_COLOR } from "@/lib/data"
import { storage } from "@/lib/storage"

// ── カラーパレット ──────────────────────────────────────
const C = {
  bg: "#0F1117",
  panel: "#161B27",
  card: "#1C2333",
  border: "#252D3F",
  ink: "#E8ECF4",
  sub: "#6B7A99",
  accent: "#4F8EF7",
  accentDim: "#1E3A6E",
  green: "#22C55E",
  greenDim: "#14381F",
  purple: "#A78BFA",
  purpleDim: "#2D1F5E",
}

const cardBase = (extra: React.CSSProperties = {}): React.CSSProperties => ({
  background: C.card,
  border: `1px solid ${C.border}`,
  borderRadius: 12,
  padding: 16,
  ...extra,
})

const chip = (active: boolean, color = C.accent, dimColor = C.accentDim): React.CSSProperties => ({
  display: "inline-flex",
  alignItems: "center",
  gap: 4,
  padding: "4px 10px",
  borderRadius: 999,
  fontSize: 11,
  fontWeight: 600,
  cursor: "pointer",
  userSelect: "none",
  transition: "all 0.15s",
  background: active ? dimColor : "#252D3F",
  color: active ? color : C.sub,
  border: `1px solid ${active ? color + "66" : "transparent"}`,
})

const btnStyle = (variant: "primary" | "ghost" | "danger" = "primary"): React.CSSProperties => ({
  padding: "8px 18px",
  borderRadius: 8,
  border: "none",
  cursor: "pointer",
  fontFamily: "inherit",
  fontWeight: 600,
  fontSize: 13,
  transition: "opacity 0.15s",
  background:
    variant === "primary" ? C.accent : variant === "danger" ? "#EF4444" : "#252D3F",
  color: variant === "ghost" ? C.sub : "#fff",
})

const inputStyle: React.CSSProperties = {
  background: "#252D3F",
  border: `1px solid ${C.border}`,
  borderRadius: 8,
  color: C.ink,
  fontSize: 13,
  padding: "8px 12px",
  outline: "none",
  fontFamily: "inherit",
  width: "100%",
  boxSizing: "border-box",
}

// ── メイン管理者アプリ ────────────────────────────────
export default function AdminApp() {
  type AdminStats = { completedScenarios: number; checkedToday: number; reflectionCount: number }

  const [view, setView] = useState<"list" | "detail" | "preview">("list")
  const [users, setUsers] = useState<User[]>([])
  const [adminStats, setAdminStats] = useState<Record<string, AdminStats>>({})
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [detailTab, setDetailTab] = useState<"scenario" | "habit">("scenario")
  const [showAddUser, setShowAddUser] = useState(false)
  const [newUserForm, setNewUserForm] = useState({ name: "", role: "", weakness: "", color: "#6366F1" })
  const [customHabitForm, setCustomHabitForm] = useState({ label: "", icon: "✏️", type: "daily" })
  const [showCustomHabit, setShowCustomHabit] = useState(false)
  const [search, setSearch] = useState("")

  useEffect(() => {
    ;(async () => {
      try {
        const [data, stats] = await Promise.all([storage.getUsers(), storage.getAdminStats()])
        setUsers(data)
        setAdminStats(stats)
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const selectedUser = users.find((u) => u.id === selectedId) ?? null

  const patchUser = (id: string, patch: Partial<User>) =>
    setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, ...patch } : u)))

  const toggleScenario = (userId: string, scenarioId: number) => {
    const u = users.find((u) => u.id === userId)!
    const has = u.scenarios.includes(scenarioId)
    patchUser(userId, { scenarios: has ? u.scenarios.filter((s) => s !== scenarioId) : [...u.scenarios, scenarioId] })
    if (has) {
      storage.removeScenario(userId, scenarioId).catch(console.error)
    } else {
      storage.assignScenario(userId, scenarioId).catch(console.error)
    }
  }

  const toggleDailyHabit = (userId: string, habitId: string) => {
    const u = users.find((u) => u.id === userId)!
    const has = u.dailyHabits.includes(habitId)
    patchUser(userId, {
      dailyHabits: has ? u.dailyHabits.filter((h) => h !== habitId) : [...u.dailyHabits, habitId],
    })
    if (has) {
      storage.removeHabit(userId, habitId, "daily").catch(console.error)
    } else {
      storage.assignHabit(userId, habitId, "daily").catch(console.error)
    }
  }

  const toggleWeeklyHabit = (userId: string, habitId: string) => {
    const u = users.find((u) => u.id === userId)!
    const has = u.weeklyHabits.includes(habitId)
    patchUser(userId, {
      weeklyHabits: has ? u.weeklyHabits.filter((h) => h !== habitId) : [...u.weeklyHabits, habitId],
    })
    if (has) {
      storage.removeHabit(userId, habitId, "weekly").catch(console.error)
    } else {
      storage.assignHabit(userId, habitId, "weekly").catch(console.error)
    }
  }

  const addCustomHabit = async () => {
    if (!customHabitForm.label || !selectedUser) return
    const type = customHabitForm.type as "daily" | "weekly"
    try {
      const newHabit = await storage.addCustomHabit(selectedUser.id, {
        icon: customHabitForm.icon,
        label: customHabitForm.label,
        category: "カスタム",
        type,
      })
      if (type === "daily") {
        patchUser(selectedUser.id, { customDailyHabits: [...selectedUser.customDailyHabits, newHabit] })
      } else {
        patchUser(selectedUser.id, { customWeeklyHabits: [...selectedUser.customWeeklyHabits, newHabit] })
      }
    } catch (e) {
      console.error(e)
    }
    setCustomHabitForm({ label: "", icon: "✏️", type: "daily" })
    setShowCustomHabit(false)
  }

  const removeCustomHabit = (type: "daily" | "weekly", habitId: string) => {
    if (!selectedUser) return
    if (type === "daily") {
      patchUser(selectedUser.id, {
        customDailyHabits: selectedUser.customDailyHabits.filter((h) => h.id !== habitId),
      })
    } else {
      patchUser(selectedUser.id, {
        customWeeklyHabits: selectedUser.customWeeklyHabits.filter((h) => h.id !== habitId),
      })
    }
    storage.removeCustomHabit(habitId).catch(console.error)
  }

  const addUser = async () => {
    if (!newUserForm.name) return
    try {
      const created = await storage.addUser({
        name: newUserForm.name,
        role: newUserForm.role,
        avatar: newUserForm.name[0],
        color: newUserForm.color,
        weakness: newUserForm.weakness,
      })
      setUsers((prev) => [...prev, created])
    } catch (e) {
      console.error(e)
    }
    setNewUserForm({ name: "", role: "", weakness: "", color: "#6366F1" })
    setShowAddUser(false)
  }

  const filteredScenarios = ALL_SCENARIOS.filter(
    (s) => s.title.includes(search) || s.tag.includes(search)
  )

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: C.bg,
          color: C.ink,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "'DM Sans','Noto Sans JP',sans-serif",
          fontSize: 14,
          gap: 10,
        }}
      >
        <div
          style={{
            width: 20,
            height: 20,
            border: `2px solid ${C.border}`,
            borderTopColor: C.accent,
            borderRadius: "50%",
            animation: "spin 0.8s linear infinite",
          }}
        />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        読み込み中...
      </div>
    )
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: C.bg,
        color: C.ink,
        fontFamily: "'DM Sans','Noto Sans JP',sans-serif",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Noto+Sans+JP:wght@400;500;600&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        button:hover { opacity: 0.85; }
        input::placeholder, textarea::placeholder { color: #3A4560; }
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-thumb { background: #252D3F; border-radius: 2px; }
      `}</style>

      {/* Header */}
      <div
        style={{
          background: C.panel,
          borderBottom: `1px solid ${C.border}`,
          padding: "14px 28px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {view !== "list" && (
            <button
              onClick={() => {
                setView("list")
                setSelectedId(null)
              }}
              style={{ ...btnStyle("ghost"), padding: "6px 12px", fontSize: 12 }}
            >
              ← 戻る
            </button>
          )}
          <div>
            <span style={{ fontSize: 16, fontWeight: 700, letterSpacing: "-0.02em" }}>
              Manager<span style={{ color: C.accent }}>5</span>
            </span>
            <span style={{ fontSize: 12, color: C.sub, marginLeft: 10 }}>管理者パネル</span>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <div
            style={{
              fontSize: 11,
              color: C.sub,
              background: "#252D3F",
              padding: "4px 10px",
              borderRadius: 6,
            }}
          >
            👤 管理者モード
          </div>
          <a
            href="/learn"
            style={{
              fontSize: 11,
              color: C.accent,
              background: C.accentDim,
              padding: "4px 10px",
              borderRadius: 6,
              textDecoration: "none",
              fontWeight: 600,
            }}
          >
            学習者画面 →
          </a>
        </div>
      </div>

      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>

        {/* ── ユーザー一覧 ── */}
        {view === "list" && (
          <div style={{ flex: 1, padding: 28, overflow: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 24 }}>
              <div>
                <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.02em", marginBottom: 4 }}>
                  学習者一覧
                </h1>
                <p style={{ fontSize: 13, color: C.sub }}>各メンバーのシナリオ・習慣を管理</p>
              </div>
              <button style={btnStyle("primary")} onClick={() => setShowAddUser(true)}>
                + メンバーを追加
              </button>
            </div>

            {/* Stats */}
            {users.length > 0 && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14, marginBottom: 24 }}>
                {[
                  { label: "メンバー数", value: users.length, icon: "👥", color: C.accent },
                  {
                    label: "平均シナリオ数",
                    value: Math.round(users.reduce((a, u) => a + u.scenarios.length, 0) / users.length),
                    icon: "🎬",
                    color: C.green,
                  },
                  {
                    label: "平均習慣数",
                    value: Math.round(
                      users.reduce((a, u) => a + u.dailyHabits.length + u.weeklyHabits.length, 0) / users.length
                    ),
                    icon: "✅",
                    color: C.purple,
                  },
                ].map((s) => (
                  <div key={s.label} style={{ ...cardBase(), position: "relative", overflow: "hidden" }}>
                    <div
                      style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: s.color }}
                    />
                    <div style={{ fontSize: 20, marginBottom: 8 }}>{s.icon}</div>
                    <div style={{ fontSize: 28, fontWeight: 700, color: s.color }}>{s.value}</div>
                    <div style={{ fontSize: 11, color: C.sub, marginTop: 2 }}>{s.label}</div>
                  </div>
                ))}
              </div>
            )}

            {/* User cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px,1fr))", gap: 14 }}>
              {users.map((u) => (
                <div
                  key={u.id}
                  style={{ ...cardBase(), cursor: "pointer", transition: "border-color 0.15s" }}
                  onClick={() => {
                    setSelectedId(u.id)
                    setView("detail")
                    setDetailTab("scenario")
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
                    <div
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: "50%",
                        background: u.color + "22",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 17,
                        color: u.color,
                        fontWeight: 700,
                        flexShrink: 0,
                      }}
                    >
                      {u.avatar}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 15, fontWeight: 700 }}>{u.name}</div>
                      <div style={{ fontSize: 11, color: C.sub }}>{u.role}</div>
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        color: u.color,
                        background: u.color + "18",
                        padding: "3px 8px",
                        borderRadius: 6,
                        fontWeight: 600,
                        whiteSpace: "nowrap",
                      }}
                    >
                      → 設定
                    </div>
                  </div>

                  {u.weakness && (
                    <div
                      style={{
                        fontSize: 12,
                        color: "#F59E0B",
                        background: "#2C1F0A",
                        border: "1px solid #3D2E0A",
                        borderRadius: 6,
                        padding: "5px 10px",
                        marginBottom: 12,
                      }}
                    >
                      📌 課題：{u.weakness}
                    </div>
                  )}

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 10 }}>
                    {[
                      {
                        label: "シナリオ",
                        value: u.scenarios.length,
                        total: ALL_SCENARIOS.length,
                        color: C.accent,
                      },
                      {
                        label: "日次習慣",
                        value: u.dailyHabits.length + u.customDailyHabits.length,
                        total: ALL_DAILY_HABITS.length,
                        color: C.green,
                      },
                      {
                        label: "週次習慣",
                        value: u.weeklyHabits.length + u.customWeeklyHabits.length,
                        total: ALL_WEEKLY_HABITS.length,
                        color: C.purple,
                      },
                    ].map((item) => (
                      <div key={item.label} style={{ background: "#252D3F", borderRadius: 8, padding: "8px 10px" }}>
                        <div style={{ fontSize: 16, fontWeight: 700, color: item.color }}>
                          {item.value}
                          <span style={{ fontSize: 10, color: C.sub }}>/{item.total}</span>
                        </div>
                        <div style={{ fontSize: 10, color: C.sub, marginTop: 2 }}>{item.label}</div>
                        <div
                          style={{
                            height: 3,
                            background: "#1A2030",
                            borderRadius: 2,
                            marginTop: 6,
                            overflow: "hidden",
                          }}
                        >
                          <div
                            style={{
                              width: `${Math.round((item.value / item.total) * 100)}%`,
                              height: "100%",
                              background: item.color,
                              borderRadius: 2,
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* 進捗ステータス */}
                  {(() => {
                    const st = adminStats[u.id] ?? { completedScenarios: 0, checkedToday: 0, reflectionCount: 0 }
                    const totalDaily = u.dailyHabits.length + u.customDailyHabits.length
                    return (
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", borderTop: `1px solid ${C.border}`, paddingTop: 10 }}>
                        {[
                          {
                            icon: "✅",
                            label: "完了",
                            value: `${st.completedScenarios}/${u.scenarios.length}シナリオ`,
                            color: C.accent,
                          },
                          {
                            icon: "📅",
                            label: "今日",
                            value: `${st.checkedToday}/${totalDaily}習慣`,
                            color: C.green,
                          },
                          {
                            icon: "🔥",
                            label: "連続",
                            value: `${u.streak}日`,
                            color: "#FB923C",
                          },
                          {
                            icon: "📝",
                            label: "振り返り",
                            value: `${st.reflectionCount}件`,
                            color: C.purple,
                          },
                        ].map((item) => (
                          <div
                            key={item.label}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 4,
                              background: "#252D3F",
                              borderRadius: 6,
                              padding: "4px 8px",
                              fontSize: 11,
                            }}
                          >
                            <span>{item.icon}</span>
                            <span style={{ color: C.sub }}>{item.label}</span>
                            <span style={{ fontWeight: 700, color: item.color }}>{item.value}</span>
                          </div>
                        ))}
                      </div>
                    )
                  })()}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── 詳細・設定画面 ── */}
        {view === "detail" && selectedUser && (
          <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
            {/* Left sidebar */}
            <div
              style={{
                width: 260,
                background: C.panel,
                borderRight: `1px solid ${C.border}`,
                padding: 24,
                flexShrink: 0,
                overflow: "auto",
              }}
            >
              <div style={{ textAlign: "center", marginBottom: 24 }}>
                <div
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: "50%",
                    background: selectedUser.color + "22",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 26,
                    color: selectedUser.color,
                    fontWeight: 700,
                    margin: "0 auto 12px",
                  }}
                >
                  {selectedUser.avatar}
                </div>
                <div style={{ fontSize: 16, fontWeight: 700 }}>{selectedUser.name}</div>
                <div style={{ fontSize: 12, color: C.sub, marginTop: 2 }}>{selectedUser.role}</div>
              </div>

              <div style={{ marginBottom: 20 }}>
                <div
                  style={{
                    fontSize: 10,
                    color: C.sub,
                    letterSpacing: "0.08em",
                    fontWeight: 600,
                    marginBottom: 8,
                  }}
                >
                  課題・弱点メモ
                </div>
                <textarea
                  value={selectedUser.weakness}
                  onChange={(e) => patchUser(selectedUser.id, { weakness: e.target.value })}
                  onBlur={(e) =>
                    storage.updateUserInfo(selectedUser.id, { weakness: e.target.value }).catch(console.error)
                  }
                  style={{ ...inputStyle, minHeight: 80, resize: "vertical", fontSize: 12 }}
                  placeholder="例：フィードバックが苦手、会議ファシリに不安"
                />
              </div>

              <div
                style={{
                  fontSize: 10,
                  color: C.sub,
                  letterSpacing: "0.08em",
                  fontWeight: 600,
                  marginBottom: 10,
                }}
              >
                割り当て状況
              </div>
              {[
                {
                  label: "シナリオ",
                  value: selectedUser.scenarios.length,
                  total: ALL_SCENARIOS.length,
                  color: C.accent,
                },
                {
                  label: "日次習慣",
                  value: selectedUser.dailyHabits.length + selectedUser.customDailyHabits.length,
                  total: ALL_DAILY_HABITS.length + selectedUser.customDailyHabits.length,
                  color: C.green,
                },
                {
                  label: "週次習慣",
                  value: selectedUser.weeklyHabits.length + selectedUser.customWeeklyHabits.length,
                  total: ALL_WEEKLY_HABITS.length + selectedUser.customWeeklyHabits.length,
                  color: C.purple,
                },
              ].map((item) => (
                <div key={item.label} style={{ marginBottom: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 5 }}>
                    <span style={{ color: C.sub }}>{item.label}</span>
                    <span style={{ fontWeight: 700, color: item.color }}>
                      {item.value}
                      <span style={{ color: C.sub, fontWeight: 400 }}>/{item.total}</span>
                    </span>
                  </div>
                  <div style={{ height: 4, background: "#252D3F", borderRadius: 2, overflow: "hidden" }}>
                    <div
                      style={{
                        width: `${item.total ? Math.round((item.value / item.total) * 100) : 0}%`,
                        height: "100%",
                        background: item.color,
                        borderRadius: 2,
                        transition: "width 0.4s",
                      }}
                    />
                  </div>
                </div>
              ))}

              <button
                style={{ ...btnStyle("ghost"), width: "100%", marginTop: 16, fontSize: 12 }}
                onClick={() => setView("preview")}
              >
                👁 学習者プレビュー
              </button>
            </div>

            {/* Right edit area */}
            <div style={{ flex: 1, overflow: "auto", padding: 28 }}>
              <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
                {(
                  [
                    ["scenario", "🎬 シナリオ"],
                    ["habit", "✅ 習慣チェック"],
                  ] as const
                ).map(([key, label]) => (
                  <button
                    key={key}
                    onClick={() => setDetailTab(key)}
                    style={{
                      padding: "8px 20px",
                      borderRadius: 8,
                      border: "none",
                      cursor: "pointer",
                      fontFamily: "inherit",
                      fontSize: 13,
                      fontWeight: 600,
                      background: detailTab === key ? C.accent : "#252D3F",
                      color: detailTab === key ? "#fff" : C.sub,
                      transition: "all 0.15s",
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {/* SCENARIO TAB */}
              {detailTab === "scenario" && (
                <div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginBottom: 16,
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 2 }}>シナリオの割り当て</div>
                      <div style={{ fontSize: 12, color: C.sub }}>学習させたいシナリオを選んでください</div>
                    </div>
                    <input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="絞り込み…"
                      style={{ ...inputStyle, width: 180, fontSize: 12 }}
                    />
                  </div>

                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 16 }}>
                    {[...new Set(ALL_SCENARIOS.map((s) => s.tag))].map((tag) => (
                      <span
                        key={tag}
                        style={{ ...chip(false), fontSize: 11 }}
                        onClick={() => setSearch(search === tag ? "" : tag)}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {filteredScenarios.map((s) => {
                      const assigned = selectedUser.scenarios.includes(s.id)
                      return (
                        <div
                          key={s.id}
                          onClick={() => toggleScenario(selectedUser.id, s.id)}
                          style={{
                            ...cardBase(),
                            display: "flex",
                            alignItems: "center",
                            gap: 14,
                            cursor: "pointer",
                            borderColor: assigned ? C.accent + "66" : C.border,
                            background: assigned ? C.accentDim : C.card,
                            transition: "all 0.18s",
                          }}
                        >
                          <div
                            style={{
                              width: 36,
                              height: 36,
                              borderRadius: 10,
                              background: assigned ? C.accent : "#252D3F",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: 16,
                              flexShrink: 0,
                              transition: "background 0.18s",
                            }}
                          >
                            {assigned ? "✓" : "🎬"}
                          </div>
                          <div style={{ flex: 1 }}>
                            <div
                              style={{
                                fontSize: 13,
                                fontWeight: 600,
                                marginBottom: 4,
                                color: assigned ? "#fff" : C.ink,
                              }}
                            >
                              {s.title}
                            </div>
                            <div style={{ display: "flex", gap: 6 }}>
                              <span
                                style={{
                                  fontSize: 10,
                                  color: C.sub,
                                  background: "#252D3F",
                                  padding: "2px 7px",
                                  borderRadius: 4,
                                }}
                              >
                                {s.tag}
                              </span>
                              <span
                                style={{
                                  fontSize: 10,
                                  fontWeight: 700,
                                  color: DIFFICULTY_COLOR[s.difficulty],
                                  background: DIFFICULTY_COLOR[s.difficulty] + "18",
                                  padding: "2px 7px",
                                  borderRadius: 4,
                                }}
                              >
                                {s.difficulty}
                              </span>
                              <span style={{ fontSize: 10, color: C.sub }}>⏱ {s.time}</span>
                            </div>
                          </div>
                          <div style={{ fontSize: 12, fontWeight: 700, color: assigned ? C.accent : C.sub }}>
                            {assigned ? "割当済 ✓" : "未割当"}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* HABIT TAB */}
              {detailTab === "habit" && (
                <div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginBottom: 20,
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 2 }}>習慣チェックの設定</div>
                      <div style={{ fontSize: 12, color: C.sub }}>日次・週次の習慣を個別に設定できます</div>
                    </div>
                    <button style={btnStyle("primary")} onClick={() => setShowCustomHabit(true)}>
                      + カスタム習慣を追加
                    </button>
                  </div>

                  {/* Daily */}
                  <div style={{ marginBottom: 28 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                      <div style={{ width: 6, height: 6, borderRadius: "50%", background: C.green }} />
                      <span style={{ fontSize: 13, fontWeight: 700, color: C.green }}>📅 日次習慣</span>
                      <span style={{ fontSize: 11, color: C.sub }}>毎日チェック</span>
                      <span style={{ marginLeft: "auto", fontSize: 11, color: C.green, fontWeight: 600 }}>
                        {selectedUser.dailyHabits.length + selectedUser.customDailyHabits.length} 件選択中
                      </span>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {ALL_DAILY_HABITS.map((h) => {
                        const on = selectedUser.dailyHabits.includes(h.id)
                        return (
                          <div
                            key={h.id}
                            onClick={() => toggleDailyHabit(selectedUser.id, h.id)}
                            style={{
                              ...cardBase({ padding: 12 }),
                              display: "flex",
                              alignItems: "center",
                              gap: 12,
                              cursor: "pointer",
                              borderColor: on ? C.green + "55" : C.border,
                              background: on ? C.greenDim : C.card,
                              transition: "all 0.15s",
                            }}
                          >
                            <div
                              style={{
                                width: 34,
                                height: 34,
                                borderRadius: 8,
                                background: on ? C.green : "#252D3F",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: 16,
                                flexShrink: 0,
                              }}
                            >
                              {on ? "✓" : h.icon}
                            </div>
                            <div style={{ flex: 1, fontSize: 13, color: on ? "#fff" : C.ink }}>{h.label}</div>
                            <span
                              style={{
                                fontSize: 10,
                                color: C.sub,
                                background: "#252D3F",
                                padding: "2px 7px",
                                borderRadius: 4,
                              }}
                            >
                              {h.category}
                            </span>
                          </div>
                        )
                      })}
                      {selectedUser.customDailyHabits.map((h) => (
                        <div
                          key={h.id}
                          style={{
                            ...cardBase({ padding: 12 }),
                            display: "flex",
                            alignItems: "center",
                            gap: 12,
                            borderColor: C.green + "55",
                            background: C.greenDim,
                          }}
                        >
                          <div
                            style={{
                              width: 34,
                              height: 34,
                              borderRadius: 8,
                              background: C.green,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: 16,
                              flexShrink: 0,
                            }}
                          >
                            {h.icon}
                          </div>
                          <div style={{ flex: 1, fontSize: 13, color: "#fff" }}>{h.label}</div>
                          <span
                            style={{
                              fontSize: 10,
                              color: "#6AAFE6",
                              background: "#1E3A6E",
                              padding: "2px 7px",
                              borderRadius: 4,
                            }}
                          >
                            カスタム
                          </span>
                          <button
                            onClick={(e) => { e.stopPropagation(); removeCustomHabit("daily", h.id) }}
                            style={{
                              background: "none",
                              border: "none",
                              color: "#EF4444",
                              cursor: "pointer",
                              fontSize: 14,
                              padding: "0 4px",
                            }}
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Weekly */}
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                      <div style={{ width: 6, height: 6, borderRadius: "50%", background: C.purple }} />
                      <span style={{ fontSize: 13, fontWeight: 700, color: C.purple }}>📆 週次習慣</span>
                      <span style={{ fontSize: 11, color: C.sub }}>週1回チェック</span>
                      <span style={{ marginLeft: "auto", fontSize: 11, color: C.purple, fontWeight: 600 }}>
                        {selectedUser.weeklyHabits.length + selectedUser.customWeeklyHabits.length} 件選択中
                      </span>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {ALL_WEEKLY_HABITS.map((h) => {
                        const on = selectedUser.weeklyHabits.includes(h.id)
                        return (
                          <div
                            key={h.id}
                            onClick={() => toggleWeeklyHabit(selectedUser.id, h.id)}
                            style={{
                              ...cardBase({ padding: 12 }),
                              display: "flex",
                              alignItems: "center",
                              gap: 12,
                              cursor: "pointer",
                              borderColor: on ? C.purple + "55" : C.border,
                              background: on ? C.purpleDim : C.card,
                              transition: "all 0.15s",
                            }}
                          >
                            <div
                              style={{
                                width: 34,
                                height: 34,
                                borderRadius: 8,
                                background: on ? C.purple : "#252D3F",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: 16,
                                flexShrink: 0,
                              }}
                            >
                              {on ? "✓" : h.icon}
                            </div>
                            <div style={{ flex: 1, fontSize: 13, color: on ? "#fff" : C.ink }}>{h.label}</div>
                            <span
                              style={{
                                fontSize: 10,
                                color: C.sub,
                                background: "#252D3F",
                                padding: "2px 7px",
                                borderRadius: 4,
                              }}
                            >
                              {h.category}
                            </span>
                          </div>
                        )
                      })}
                      {selectedUser.customWeeklyHabits.map((h) => (
                        <div
                          key={h.id}
                          style={{
                            ...cardBase({ padding: 12 }),
                            display: "flex",
                            alignItems: "center",
                            gap: 12,
                            borderColor: C.purple + "55",
                            background: C.purpleDim,
                          }}
                        >
                          <div
                            style={{
                              width: 34,
                              height: 34,
                              borderRadius: 8,
                              background: C.purple,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: 16,
                              flexShrink: 0,
                            }}
                          >
                            {h.icon}
                          </div>
                          <div style={{ flex: 1, fontSize: 13, color: "#fff" }}>{h.label}</div>
                          <span
                            style={{
                              fontSize: 10,
                              color: "#6AAFE6",
                              background: "#1E3A6E",
                              padding: "2px 7px",
                              borderRadius: 4,
                            }}
                          >
                            カスタム
                          </span>
                          <button
                            onClick={(e) => { e.stopPropagation(); removeCustomHabit("weekly", h.id) }}
                            style={{
                              background: "none",
                              border: "none",
                              color: "#EF4444",
                              cursor: "pointer",
                              fontSize: 14,
                              padding: "0 4px",
                            }}
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── 学習者プレビュー ── */}
        {view === "preview" && selectedUser && (
          <div style={{ flex: 1, overflow: "auto", padding: 28 }}>
            <div style={{ maxWidth: 420, margin: "0 auto" }}>
              <div
                style={{
                  background: "#F7F4EE",
                  border: `2px dashed ${C.border}`,
                  borderRadius: 16,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    background: "#fff",
                    borderBottom: "1px solid #E8E4DC",
                    padding: "12px 20px",
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                  }}
                >
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: "50%",
                      background: selectedUser.color + "22",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 12,
                      color: selectedUser.color,
                      fontWeight: 700,
                    }}
                  >
                    {selectedUser.avatar}
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#1C1A16" }}>
                      {selectedUser.name}さんの画面
                    </div>
                    <div style={{ fontSize: 10, color: "#7A7567" }}>学習者プレビュー</div>
                  </div>
                  <div
                    style={{
                      marginLeft: "auto",
                      fontSize: 11,
                      color: "#D4600A",
                      background: "#FFF0E6",
                      padding: "3px 8px",
                      borderRadius: 6,
                      fontWeight: 600,
                    }}
                  >
                    プレビュー中
                  </div>
                </div>
                <div style={{ padding: 20 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#1C1A16", marginBottom: 14 }}>
                    🎬 割り当てシナリオ（{selectedUser.scenarios.length}件）
                  </div>
                  {selectedUser.scenarios.length === 0 && (
                    <div
                      style={{
                        fontSize: 12,
                        color: "#7A7567",
                        padding: 12,
                        background: "#F0EDE6",
                        borderRadius: 8,
                        marginBottom: 16,
                      }}
                    >
                      まだシナリオが割り当てられていません
                    </div>
                  )}
                  {ALL_SCENARIOS.filter((s) => selectedUser.scenarios.includes(s.id)).map((s) => (
                    <div
                      key={s.id}
                      style={{
                        background: "#fff",
                        border: "1px solid #E8E4DC",
                        borderRadius: 10,
                        padding: 12,
                        marginBottom: 8,
                        display: "flex",
                        gap: 10,
                        alignItems: "center",
                      }}
                    >
                      <div style={{ fontSize: 18 }}>🎬</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: "#1C1A16", marginBottom: 3 }}>
                          {s.title}
                        </div>
                        <div style={{ display: "flex", gap: 4 }}>
                          <span
                            style={{
                              fontSize: 10,
                              color: "#7A7567",
                              background: "#F0EDE6",
                              padding: "1px 6px",
                              borderRadius: 4,
                            }}
                          >
                            {s.tag}
                          </span>
                          <span
                            style={{
                              fontSize: 10,
                              fontWeight: 700,
                              color: DIFFICULTY_COLOR[s.difficulty],
                            }}
                          >
                            {s.difficulty}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}

                  <div style={{ fontSize: 13, fontWeight: 700, color: "#1C1A16", margin: "20px 0 14px" }}>
                    ✅ 習慣チェック
                  </div>

                  <div style={{ fontSize: 11, fontWeight: 600, color: "#2A7A4B", marginBottom: 8 }}>
                    📅 日次（
                    {selectedUser.dailyHabits.length + selectedUser.customDailyHabits.length}件）
                  </div>
                  {[
                    ...ALL_DAILY_HABITS.filter((h) => selectedUser.dailyHabits.includes(h.id)),
                    ...selectedUser.customDailyHabits,
                  ].map((h) => (
                    <div
                      key={h.id}
                      style={{
                        background: "#fff",
                        border: "1px solid #E8E4DC",
                        borderRadius: 8,
                        padding: "9px 12px",
                        marginBottom: 6,
                        display: "flex",
                        gap: 8,
                        alignItems: "center",
                      }}
                    >
                      <span style={{ fontSize: 16 }}>{h.icon}</span>
                      <span style={{ fontSize: 12, color: "#1C1A16" }}>{h.label}</span>
                    </div>
                  ))}
                  {selectedUser.dailyHabits.length + selectedUser.customDailyHabits.length === 0 && (
                    <div style={{ fontSize: 11, color: "#7A7567", padding: 8 }}>未設定</div>
                  )}

                  <div style={{ fontSize: 11, fontWeight: 600, color: "#6B4FA8", margin: "14px 0 8px" }}>
                    📆 週次（
                    {selectedUser.weeklyHabits.length + selectedUser.customWeeklyHabits.length}件）
                  </div>
                  {[
                    ...ALL_WEEKLY_HABITS.filter((h) => selectedUser.weeklyHabits.includes(h.id)),
                    ...selectedUser.customWeeklyHabits,
                  ].map((h) => (
                    <div
                      key={h.id}
                      style={{
                        background: "#fff",
                        border: "1px solid #E8E4DC",
                        borderRadius: 8,
                        padding: "9px 12px",
                        marginBottom: 6,
                        display: "flex",
                        gap: 8,
                        alignItems: "center",
                      }}
                    >
                      <span style={{ fontSize: 16 }}>{h.icon}</span>
                      <span style={{ fontSize: 12, color: "#1C1A16" }}>{h.label}</span>
                    </div>
                  ))}
                  {selectedUser.weeklyHabits.length + selectedUser.customWeeklyHabits.length === 0 && (
                    <div style={{ fontSize: 11, color: "#7A7567", padding: 8 }}>未設定</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Add User Modal */}
      {showAddUser && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "#00000099",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 100,
          }}
        >
          <div
            style={{
              background: C.panel,
              border: `1px solid ${C.border}`,
              borderRadius: 16,
              padding: 28,
              width: 380,
              maxWidth: "90vw",
            }}
          >
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 20 }}>メンバーを追加</div>
            {(
              [
                { label: "氏名", key: "name", placeholder: "田中 蓮" },
                { label: "役職・ロール", key: "role", placeholder: "シニアエンジニア" },
                { label: "課題・弱点メモ", key: "weakness", placeholder: "例：フィードバックが苦手" },
              ] as const
            ).map((f) => (
              <div key={f.key} style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 11, color: C.sub, marginBottom: 6, fontWeight: 600 }}>{f.label}</div>
                <input
                  value={newUserForm[f.key]}
                  onChange={(e) => setNewUserForm((p) => ({ ...p, [f.key]: e.target.value }))}
                  placeholder={f.placeholder}
                  style={inputStyle}
                />
              </div>
            ))}
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 11, color: C.sub, marginBottom: 8, fontWeight: 600 }}>アバターカラー</div>
              <div style={{ display: "flex", gap: 8 }}>
                {["#4F8EF7", "#2DD4BF", "#F472B6", "#A78BFA", "#FB923C", "#22C55E"].map((c) => (
                  <div
                    key={c}
                    onClick={() => setNewUserForm((p) => ({ ...p, color: c }))}
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: "50%",
                      background: c,
                      cursor: "pointer",
                      border: newUserForm.color === c ? "2px solid #fff" : "2px solid transparent",
                      transition: "border 0.15s",
                    }}
                  />
                ))}
              </div>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button style={{ ...btnStyle("primary"), flex: 1 }} onClick={addUser}>
                追加する
              </button>
              <button style={{ ...btnStyle("ghost"), flex: 1 }} onClick={() => setShowAddUser(false)}>
                キャンセル
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Habit Modal */}
      {showCustomHabit && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "#00000099",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 100,
          }}
        >
          <div
            style={{
              background: C.panel,
              border: `1px solid ${C.border}`,
              borderRadius: 16,
              padding: 28,
              width: 360,
              maxWidth: "90vw",
            }}
          >
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 20 }}>カスタム習慣を追加</div>
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 11, color: C.sub, marginBottom: 6, fontWeight: 600 }}>種類</div>
              <div style={{ display: "flex", gap: 8 }}>
                {(
                  [
                    ["daily", "📅 日次"],
                    ["weekly", "📆 週次"],
                  ] as const
                ).map(([val, label]) => (
                  <button
                    key={val}
                    onClick={() => setCustomHabitForm((p) => ({ ...p, type: val }))}
                    style={{
                      flex: 1,
                      padding: "8px 0",
                      borderRadius: 8,
                      border: `1px solid ${customHabitForm.type === val ? C.accent : C.border}`,
                      background: customHabitForm.type === val ? C.accentDim : "#252D3F",
                      color: customHabitForm.type === val ? C.accent : C.sub,
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: "pointer",
                      fontFamily: "inherit",
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 11, color: C.sub, marginBottom: 6, fontWeight: 600 }}>習慣の内容</div>
              <input
                value={customHabitForm.label}
                onChange={(e) => setCustomHabitForm((p) => ({ ...p, label: e.target.value }))}
                placeholder="例：朝会前に議題を共有した"
                style={inputStyle}
              />
            </div>
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 11, color: C.sub, marginBottom: 8, fontWeight: 600 }}>アイコン</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {["✏️", "🎯", "💡", "🔥", "📌", "🤝", "👀", "💬", "📊", "🌟"].map((icon) => (
                  <div
                    key={icon}
                    onClick={() => setCustomHabitForm((p) => ({ ...p, icon }))}
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 8,
                      background: customHabitForm.icon === icon ? C.accentDim : "#252D3F",
                      border: `1px solid ${customHabitForm.icon === icon ? C.accent : "transparent"}`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 18,
                      cursor: "pointer",
                    }}
                  >
                    {icon}
                  </div>
                ))}
              </div>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button style={{ ...btnStyle("primary"), flex: 1 }} onClick={addCustomHabit}>
                追加する
              </button>
              <button style={{ ...btnStyle("ghost"), flex: 1 }} onClick={() => setShowCustomHabit(false)}>
                キャンセル
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
