export const metadata = {
  title: 'AGEL — Kardiochirurgie JIP | Rozpis směn',
  description: 'Plánování směn pro Nemocnici Třinec-Podlesí, Kardiochirurgie JIP',
}
export default function RootLayout({ children }) {
  return (
    <html lang="cs">
      <body style={{ margin: 0, padding: 0, fontFamily: "'Segoe UI', Arial, sans-serif" }}>
        {children}
      </body>
    </html>
  )
}
