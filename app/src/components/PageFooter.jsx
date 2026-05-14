import { T } from '../lib/tokens'

export default function PageFooter() {
  return (
    <div style={{ borderTop: `1px solid ${T.ink}`, marginTop: 40 }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '20px 32px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 16, flexWrap: 'wrap', textAlign: 'center', fontFamily: T.mono, fontSize: 10, letterSpacing: '0.18em', color: T.inkMuted }}>
        <span>© Artoir {new Date().getFullYear()}</span>
        <span>展覧会プラットフォーム</span>
        <span>Artoir(アルトワール)</span>
      </div>
    </div>
  )
}