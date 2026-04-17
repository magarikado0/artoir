import { Link } from 'react-router-dom'
import Header from '../components/Header'
import { IS_DEV } from '../lib/demoData'

const GAP = 'clamp(2rem, 5vw, 5rem)'

export default function HomePage() {
  return (
    <div style={{ background: '#f5f0e8', minHeight: '100vh' }}>
      <Header />

      {/* Hero */}
      <section style={{
        padding: `calc(${GAP} * 3) ${GAP} calc(${GAP} * 2)`,
        borderBottom: '1px solid rgba(26,22,18,0.1)',
        maxWidth: '900px',
      }}>
        <div style={{
          fontFamily: 'Cormorant Garamond, serif',
          fontSize: '0.65rem',
          letterSpacing: '0.35em',
          textTransform: 'uppercase',
          color: '#c0392b',
          marginBottom: '2rem',
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
        }}>
          <span style={{ display: 'block', width: '2rem', height: '1px', background: '#c0392b' }} />
          Exhibition Portal
        </div>
        <h1 style={{
          fontFamily: 'Shippori Mincho, serif',
          fontSize: 'clamp(3rem, 8vw, 7rem)',
          fontWeight: 400,
          lineHeight: 1.05,
          letterSpacing: '-0.01em',
          color: '#1a1612',
          marginBottom: '2rem',
        }}>
          展覧会を、<br />ひとつの場所に。
        </h1>
        <p style={{
          fontSize: '0.9rem',
          lineHeight: 2,
          color: '#3d3530',
          maxWidth: '50ch',
          marginBottom: '3rem',
        }}>
          Artportは、アート団体が展覧会と作品を公開・共有するためのポータルです。
          URLひとつで、あなたの展示をすべての人へ届けます。
        </p>

        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
          {IS_DEV && (
            <Link to="/exhibitions" style={{
              fontFamily: 'Cormorant Garamond, serif',
              fontSize: '0.8rem',
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              color: '#f5f0e8',
              background: '#1a1612',
              padding: '0.75rem 1.8rem',
              textDecoration: 'none',
              display: 'inline-block',
            }}>
              展覧会一覧を見る
            </Link>
          )}
        </div>
      </section>

      {/* How it works */}
      <section style={{ padding: `calc(${GAP} * 2) ${GAP}` }}>
        <div style={{
          fontFamily: 'Cormorant Garamond, serif',
          fontSize: '0.65rem',
          letterSpacing: '0.35em',
          textTransform: 'uppercase',
          color: '#9a9088',
          marginBottom: '3rem',
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
        }}>
          How it works
          <span style={{ flex: 1, height: '1px', background: 'rgba(26,22,18,0.1)' }} />
        </div>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: `${GAP}`,
        }} className="how-grid-responsive">
          {[
            { num: '01', title: '団体ページ', desc: '団体名・説明・SNSリンクをまとめて公開。すべての展覧会への入口になります。' },
            { num: '02', title: '展覧会ページ', desc: '会期・会場・作品一覧を一ページに。背景色のカスタマイズで展示の雰囲気を表現できます。' },
            { num: '03', title: 'シェアリンク', desc: 'artport.jp/{団体名}/exhibition/{展覧会名} のURLで誰でも閲覧可能。ログイン不要。' },
          ].map(({ num, title, desc }) => (
            <div key={num} style={{ borderTop: '1px solid rgba(26,22,18,0.1)', paddingTop: '1.5rem' }}>
              <div style={{
                fontFamily: 'Cormorant Garamond, serif',
                fontSize: '2rem',
                fontWeight: 300,
                color: 'rgba(26,22,18,0.15)',
                marginBottom: '1rem',
              }}>{num}</div>
              <div style={{
                fontFamily: 'Shippori Mincho, serif',
                fontSize: '1.1rem',
                color: '#1a1612',
                marginBottom: '0.75rem',
              }}>{title}</div>
              <div style={{ fontSize: '0.82rem', lineHeight: 1.9, color: '#6b6460' }}>{desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* URL example */}
      <section style={{
        background: '#1a1612',
        padding: `calc(${GAP} * 1.5) ${GAP}`,
      }}>
        <div style={{
          fontFamily: 'Cormorant Garamond, serif',
          fontSize: '0.65rem',
          letterSpacing: '0.35em',
          textTransform: 'uppercase',
          color: '#b8932a',
          marginBottom: '1.5rem',
        }}>URL</div>
        <div style={{
          fontFamily: 'Cormorant Garamond, serif',
          fontSize: 'clamp(1rem, 2.5vw, 1.6rem)',
          color: 'rgba(245,240,232,0.5)',
          letterSpacing: '0.05em',
        }}>
          artport.jp/<span style={{ color: '#f5f0e8' }}>{'{団体名}'}</span>/exhibition/<span style={{ color: '#f5f0e8' }}>{'{展覧会名}'}</span>
        </div>
      </section>

      <footer style={{
        padding: `2rem ${GAP}`,
        borderTop: '1px solid rgba(26,22,18,0.1)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        fontSize: '0.7rem',
        color: '#9a9088',
        letterSpacing: '0.1em',
      }}>
        <div>© {new Date().getFullYear()} Artport</div>
        <div>展覧会のポータル</div>
      </footer>

      <style>{`
        @media (max-width: 768px) {
          .how-grid-responsive { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  )
}
