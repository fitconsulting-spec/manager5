export default function Home() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#F7F4EE",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        fontFamily: "'DM Sans', 'Noto Sans JP', Arial, sans-serif",
      }}
    >
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Fraunces:wght@400;700&family=DM+Sans:wght@400;500;600;700&family=Noto+Sans+JP:wght@400;500;600&display=swap');`}</style>
      <div style={{ maxWidth: 420, width: "100%", textAlign: "center" }}>
        <div
          style={{
            fontSize: 48,
            fontWeight: 700,
            fontFamily: "'Fraunces', Georgia, serif",
            letterSpacing: "-0.03em",
            color: "#1C1A16",
            marginBottom: 8,
          }}
        >
          Manager<span style={{ color: "#D4600A" }}>5</span>
        </div>
        <div
          style={{
            fontSize: 15,
            color: "#7A7567",
            marginBottom: 48,
            lineHeight: 1.6,
          }}
        >
          新任管理職のための
          <br />
          マイクロラーニングアプリ
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <a
            href="/learn"
            style={{
              display: "block",
              background: "#D4600A",
              color: "#fff",
              borderRadius: 14,
              padding: "20px 24px",
              textDecoration: "none",
              transition: "opacity 0.15s",
            }}
          >
            <div style={{ fontSize: 28, marginBottom: 6 }}>📱</div>
            <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 4 }}>学習者画面</div>
            <div style={{ fontSize: 13, opacity: 0.85 }}>
              シナリオ学習・習慣チェック・振り返りを行う
            </div>
          </a>

          <a
            href="/admin"
            style={{
              display: "block",
              background: "#1C2333",
              color: "#E8ECF4",
              borderRadius: 14,
              padding: "20px 24px",
              textDecoration: "none",
              transition: "opacity 0.15s",
            }}
          >
            <div style={{ fontSize: 28, marginBottom: 6 }}>⚙️</div>
            <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 4 }}>管理者パネル</div>
            <div style={{ fontSize: 13, opacity: 0.7 }}>
              メンバーのシナリオ・習慣を設定・管理する
            </div>
          </a>
        </div>

        <div
          style={{
            marginTop: 32,
            fontSize: 12,
            color: "#B0A898",
          }}
        >
          管理者がシナリオ・習慣を設定 → 学習者画面に反映
        </div>
      </div>
    </div>
  )
}
