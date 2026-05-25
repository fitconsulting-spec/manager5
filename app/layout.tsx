import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "Manager5 - 新任管理職のための5分学習",
  description: "シナリオ学習・習慣チェック・振り返りで管理職スキルを磨くマイクロラーニングアプリ",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  )
}
