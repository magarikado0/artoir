import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { BrandLockup } from '../components/BrandMark'
import './LandingPage.css'

const INSTAGRAM_URL = 'https://instagram.com/artoir_archive'

const NAV_ITEMS = [
  { href: '#about', label: 'Artoirとは' },
  { href: '#features', label: '機能' },
  { href: '#flow', label: '掲載の流れ' },
  { href: '#cases', label: '事例' },
  { href: '#recruit', label: '掲載団体募集' },
]

/* ── 線画アイコン(lucide 風のインライン SVG) ── */
function LpIcon({ name, size = 26 }) {
  const s = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.5, strokeLinecap: 'round', strokeLinejoin: 'round' }
  if (name === 'image') return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <rect x="3" y="4" width="18" height="16" rx="2" {...s} />
      <circle cx="8.6" cy="9.4" r="1.7" {...s} />
      <path d="M21 15.5l-4.6-4.6a1 1 0 0 0-1.4 0L6 20" {...s} />
    </svg>
  )
  if (name === 'cube') return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 2.5l8 4.5v10l-8 4.5-8-4.5V7l8-4.5z" {...s} />
      <path d="M12 12l8-4.5M12 12L4 7.5M12 12v9.5" {...s} />
    </svg>
  )
  if (name === 'archive') return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <rect x="3" y="4" width="18" height="4.5" rx="1" {...s} />
      <path d="M5 8.5V18a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8.5" {...s} />
      <path d="M10 13h4" {...s} />
    </svg>
  )
  if (name === 'users') return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="9" cy="8" r="3.2" {...s} />
      <path d="M3 20c1.3-3.2 3.4-4.8 6-4.8s4.7 1.6 6 4.8" {...s} />
      <path d="M16 5.2a3.2 3.2 0 0 1 0 6.1M18.5 20c-.5-1.6-1.3-2.9-2.4-3.8" {...s} />
    </svg>
  )
  if (name === 'plane') return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M21.5 2.5L10.8 13.2M21.5 2.5L14.7 21.5l-3.9-8.3-8.3-3.9L21.5 2.5z" {...s} />
    </svg>
  )
  if (name === 'user-plus') return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="9" cy="8" r="3.6" {...s} />
      <path d="M3 20.5c1.4-3.6 3.6-5.3 6-5.3s4.6 1.7 6 5.3" {...s} />
      <path d="M18.5 6.5v6M15.5 9.5h6" {...s} />
    </svg>
  )
  if (name === 'mail') return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <rect x="3" y="5" width="18" height="14" rx="2" {...s} />
      <path d="M3.5 7l8.5 6 8.5-6" {...s} />
    </svg>
  )
  if (name === 'instagram') return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <rect x="3.5" y="3.5" width="17" height="17" rx="4.5" {...s} />
      <circle cx="12" cy="12" r="3.8" {...s} />
      <circle cx="17" cy="7" r="0.6" fill="currentColor" stroke="none" />
    </svg>
  )
  return null
}

/* ── ギャラリー内観のコンポジション(写真アセットがないため CSS + SVG で描画) ── */
function ArtMain() {
  return (
    <svg viewBox="0 0 100 72" preserveAspectRatio="none" aria-hidden="true">
      <rect width="100" height="72" fill="#F6F0E4" />
      <circle cx="37" cy="29" r="16.5" fill="#BE553D" opacity="0.92" />
      <circle cx="43" cy="24" r="5.5" fill="#F6F0E4" opacity="0.35" />
      <rect x="64" y="36" width="17" height="24" fill="#E9BDAE" opacity="0.85" />
      <path d="M58 12q16 9 9 30" fill="none" stroke="#B8923A" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M12 57c22-9 54-9 76-1" fill="none" stroke="#1F1B17" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M16 62c20-6 46-6 66-1" fill="none" stroke="#1F1B17" strokeWidth="0.8" strokeLinecap="round" opacity="0.4" />
    </svg>
  )
}

function ArtSideBands() {
  return (
    <svg viewBox="0 0 60 78" preserveAspectRatio="none" aria-hidden="true">
      <rect width="60" height="78" fill="#F6F0E4" />
      <rect x="10" y="12" width="9" height="54" rx="4.5" fill="#6B7355" opacity="0.8" />
      <rect x="25" y="20" width="9" height="46" rx="4.5" fill="#B8923A" opacity="0.75" />
      <rect x="40" y="8" width="9" height="58" rx="4.5" fill="#BE553D" opacity="0.85" />
    </svg>
  )
}

function ArtSideInk() {
  return (
    <svg viewBox="0 0 60 62" preserveAspectRatio="none" aria-hidden="true">
      <rect width="60" height="62" fill="#F6F0E4" />
      <path d="M14 46C16 26 32 14 46 16c-16 6-22 18-20 32" fill="#1F1B17" opacity="0.85" />
      <circle cx="45" cy="44" r="4" fill="#BE553D" />
    </svg>
  )
}

function GalleryScene({ mini = false }) {
  return (
    <div className={`lp-gallery-scene${mini ? ' lp-gallery-scene--mini' : ''}`} aria-hidden="true">
      <div className="lp-gallery-wall" />
      <div className="lp-gallery-floor" />
      <div className="lp-frame lp-frame--main"><ArtMain /></div>
      <div className="lp-frame lp-frame--side1"><ArtSideBands /></div>
      <div className="lp-frame lp-frame--side2"><ArtSideInk /></div>
    </div>
  )
}

/* ── ノートPC / スマホの中に表示するミニチュア展覧会ページ ── */
function MiniSite({ compact = false }) {
  return (
    <div className={`lp-mini${compact ? ' lp-mini--compact' : ''}`}>
      <div className="lp-mini-topbar">
        <span className="lp-mini-brand">Artoir<span>.</span></span>
        {!compact && <span className="lp-mini-navdots"><i /><i /><i /></span>}
      </div>
      <div className="lp-mini-photo"><GalleryScene mini /></div>
      <div className="lp-mini-title">光のかたち 展</div>
      <div className="lp-mini-date">2024.11.02 — 11.04・大学会館ギャラリー</div>
      <div className="lp-mini-thumbs">
        <i className="lp-mini-thumb--1" />
        <i className="lp-mini-thumb--2" />
        <i className="lp-mini-thumb--3" />
        {!compact && <i className="lp-mini-thumb--4" />}
      </div>
    </div>
  )
}

function DeviceMockups() {
  return (
    <div className="lp-devices" aria-hidden="true">
      <div className="lp-laptop">
        <div className="lp-laptop-screen"><MiniSite /></div>
        <div className="lp-laptop-base" />
      </div>
      <div className="lp-phone"><MiniSite compact /></div>
    </div>
  )
}

const FEATURES = [
  {
    icon: 'image',
    title: '展覧会ページを作成',
    body: '展覧会ごとに専用ページを作成。作品・会期・コンセプトなどをまとめて紹介できます。',
  },
  {
    icon: 'cube',
    title: '3Dで巡る展示体験',
    body: '実際の展示空間を3Dで再現。自宅からでも、会場を歩くように作品を鑑賞できます。',
  },
  {
    icon: 'archive',
    title: 'いつでも見られるアーカイブ',
    body: '過去の展覧会も美しく保存。代替わりしても、活動の記録を未来へつなぎます。',
  },
  {
    icon: 'users',
    title: '多くの人に届ける',
    body: 'ポータルサイトで多くの人に発見され、新しい出会いやつながりを生み出します。',
  },
]

export default function LandingPage() {
  useEffect(() => {
    document.title = 'Artoir — 展覧会の記録を、いつまでも美しく。'
    return () => { document.title = 'Artoir' }
  }, [])

  return (
    <div className="lp-page">
      {/* ── ヘッダー ── */}
      <header className="lp-header">
        <div className="lp-container lp-header-inner">
          <Link to="/" className="lp-header-brand" aria-label="Artoir home">
            <BrandLockup />
          </Link>
          <nav className="lp-header-nav" aria-label="ランディングページ内メニュー">
            {NAV_ITEMS.map((item) => (
              <a key={item.href} href={item.href} className="lp-header-link">{item.label}</a>
            ))}
          </nav>
          <div className="lp-header-actions">
            <Link to="/login" className="lp-btn lp-btn--outline lp-btn--sm">ログイン</Link>
            <Link to="/login" className="lp-btn lp-btn--fill lp-btn--sm">アカウント作成</Link>
          </div>
        </div>
      </header>

      <main>
        {/* ── ヒーロー ── */}
        <section id="about" className="lp-hero">
          <div className="lp-container lp-hero-grid">
            <div className="lp-hero-copy">
              <p className="lp-eyebrow">展示の体験ごと、未来へつなぐアーカイブ</p>
              <h1 className="lp-hero-title">
                展覧会の記録を、<br />
                いつまでも<span className="lp-accent">美しく</span>。
              </h1>
              <p className="lp-hero-body">
                Artoirは、展覧会をWeb上に残し、<br className="lp-br-desktop" />
                いつでも誰でも作品や展示空間を体験できる<br className="lp-br-desktop" />
                アートアーカイブプラットフォームです。
              </p>
              <div className="lp-hero-actions">
                <Link to="/exhibitions" className="lp-btn lp-btn--fill">展覧会を探す</Link>
                <a href="#recruit" className="lp-btn lp-btn--outline">掲載団体を募集しています</a>
              </div>
            </div>
            <div className="lp-hero-visual">
              <GalleryScene />
            </div>
          </div>
        </section>

        {/* ── Artoirでできること ── */}
        <section id="features" className="lp-section lp-features">
          <div className="lp-container">
            <h2 className="lp-section-title">Artoirでできること</h2>
            <div className="lp-heading-rule" aria-hidden="true" />
            <div className="lp-feature-grid">
              {FEATURES.map((f) => (
                <div key={f.title} className="lp-feature">
                  <span className="lp-feature-icon"><LpIcon name={f.icon} /></span>
                  <h3 className="lp-feature-title">{f.title}</h3>
                  <p className="lp-feature-body">{f.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── 掲載事例(掲載の流れのアンカーもこの帯に置く) ── */}
        <section id="flow" className="lp-cases-band">
          <div id="cases" className="lp-container lp-cases-grid">
            <div className="lp-cases-copy">
              <p className="lp-label">掲載事例</p>
              <h2 className="lp-cases-title">光のかたち 展</h2>
              <p className="lp-cases-sub">美術部 OB 展<span className="lp-cases-sep">/</span>2024.11</p>
              <Link to="/exhibitions" className="lp-btn lp-btn--outline">事例をもっと見る →</Link>
            </div>
            <div className="lp-cases-visual">
              <DeviceMockups />
            </div>
          </div>
        </section>

        {/* ── 掲載団体募集 CTA ── */}
        <section id="recruit" className="lp-section lp-recruit">
          <div className="lp-container">
            <div className="lp-recruit-card">
              <p className="lp-label">掲載団体募集中</p>
              <h2 className="lp-recruit-title">あなたの展覧会をArtoirで公開しませんか?</h2>
              <p className="lp-recruit-body">
                これからの展覧会も、過去の展覧会も掲載できます。<br className="lp-br-desktop" />
                まずはお気軽にご相談ください。
              </p>
              <div className="lp-recruit-options">
                <a href={INSTAGRAM_URL} target="_blank" rel="noreferrer" className="lp-recruit-option">
                  <span className="lp-recruit-option-icon"><LpIcon name="plane" size={22} /></span>
                  <span className="lp-recruit-option-copy">
                    <strong>DMで相談する</strong>
                    <small>@artoir_archive へメッセージ</small>
                  </span>
                </a>
                <Link to="/login" className="lp-recruit-option">
                  <span className="lp-recruit-option-icon"><LpIcon name="user-plus" size={22} /></span>
                  <span className="lp-recruit-option-copy">
                    <strong>自分でアカウントを作成して投稿する</strong>
                    <small>無料でアカウント作成・投稿できます</small>
                  </span>
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* ── フッター ── */}
      <footer className="lp-footer">
        <div className="lp-container lp-footer-inner">
          <div className="lp-footer-brand">
            <BrandLockup />
            <p className="lp-footer-tagline">展覧会の記録を、未来へつなぐアーカイブ</p>
          </div>
          <nav className="lp-footer-nav" aria-label="フッターメニュー">
            {NAV_ITEMS.map((item) => (
              <a key={item.href} href={item.href} className="lp-footer-link">{item.label}</a>
            ))}
          </nav>
          <div className="lp-footer-social">
            <a
              href={INSTAGRAM_URL}
              target="_blank"
              rel="noreferrer"
              className="lp-footer-social-link"
              aria-label="Instagram"
            >
              <LpIcon name="instagram" size={20} />
            </a>
            {/* TODO: 公開用メールアドレスが決まったら mailto: に設定する */}
            <a href="mailto:" className="lp-footer-social-link" aria-label="メールでのお問い合わせ">
              <LpIcon name="mail" size={20} />
            </a>
          </div>
        </div>
        <div className="lp-container lp-footer-copyright">© {new Date().getFullYear()} Artoir</div>
      </footer>
    </div>
  )
}
