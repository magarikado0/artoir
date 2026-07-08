import { Link } from 'react-router-dom'
import { BrandLockup } from './BrandMark'
import { SIGNUP_PATH } from '../lib/siteLinks'

export function LpGlyph({ name, size = 26 }) {
  const s = { stroke: 'currentColor', strokeWidth: 1.6, fill: 'none', strokeLinecap: 'round', strokeLinejoin: 'round' }
  if (name === 'create') return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <rect x="3.5" y="4.5" width="17" height="15" rx="1.5" {...s} />
      <path d="M3.5 15.5l4.8-4.6 4.2 4 3-2.8 5 4.4" {...s} />
      <circle cx="15.5" cy="9" r="1.6" {...s} />
    </svg>
  )
  if (name === 'cube') return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3z" {...s} />
      <path d="M12 12l8-4.5M12 12L4 7.5M12 12v9" {...s} />
    </svg>
  )
  if (name === 'archive') return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <rect x="3.5" y="4.5" width="17" height="4.5" rx="1" {...s} />
      <path d="M5.5 9v9.5a1 1 0 0 0 1 1h11a1 1 0 0 0 1-1V9" {...s} />
      <path d="M10 13h4" {...s} />
    </svg>
  )
  if (name === 'reach') return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="9" cy="8" r="3.2" {...s} />
      <path d="M3 20c1.3-3.2 3.4-4.8 6-4.8s4.7 1.6 6 4.8" {...s} />
      <path d="M16 5.2a3.2 3.2 0 0 1 0 6.1M18.5 20c-.5-1.6-1.3-2.9-2.4-3.8" {...s} />
    </svg>
  )
  if (name === 'send') return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M21 3L10.5 13.5M21 3l-7 18-3.5-7.5L3 10l18-7z" {...s} />
    </svg>
  )
  if (name === 'user-plus') return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="10" cy="8" r="3.6" {...s} />
      <path d="M3.5 20c1.5-3.4 3.9-5 6.5-5s5 1.6 6.5 5" {...s} />
      <path d="M18.5 8.5v5M16 11h5" {...s} />
    </svg>
  )
  return null
}

export function LpHeader() {
  return (
    <header className="ui-lp-header">
      <Link to="/" className="ui-topbar-brand" aria-label="Artoir home">
        <BrandLockup />
      </Link>
      <nav className="ui-lp-header-nav" aria-label="サイトメニュー">
        <a href="/#about">Artoirとは</a>
        <a href="/#features">できること</a>
        <a href="/#cases">掲載事例</a>
        <Link to="/exhibitions">展覧会を探す</Link>
        <Link to="/publish">掲載団体募集</Link>
      </nav>
      <div className="ui-lp-header-actions">
        <Link to="/login" className="ui-lp-btn ui-lp-btn--ghost">ログイン</Link>
        <Link to={SIGNUP_PATH} className="ui-lp-btn ui-lp-btn--accent">アカウント作成</Link>
      </div>
    </header>
  )
}

export function LpFooter() {
  return (
    <footer className="ui-lp-footer">
      <div className="ui-lp-footer-inner">
        <div>
          <BrandLockup />
          <p className="ui-lp-footer-tagline">展覧会の記録を、未来へつなぐアーカイブ</p>
        </div>
        <nav className="ui-lp-footer-nav" aria-label="フッターメニュー">
          <Link to="/exhibitions">展覧会一覧</Link>
          <Link to="/orgs">団体</Link>
          <Link to="/creators">作家</Link>
          <Link to="/publish">掲載団体募集</Link>
          <Link to="/login">ログイン</Link>
        </nav>
        <div className="ui-lp-footer-legal">© {new Date().getFullYear()} Artoir</div>
      </div>
    </footer>
  )
}
