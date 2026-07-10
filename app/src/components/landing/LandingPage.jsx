import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { BrandLockup } from '../BrandMark'
import { Icon } from '../Header'
import LoadingFrames from '../LoadingFrames'
import FrameIntro from './FrameIntro'
import HorizontalFeatureSection from './HorizontalFeatureSection'
import FinalCTA from './FinalCTA'
import { LANDING_LINKS } from './landingConfig'
import styles from './landing.module.css'

const INTRO_SEEN_KEY = 'artoir-lp-intro-seen'

export default function LandingPage() {
  const [introMode, setIntroMode] = useState('checking')

  useEffect(() => {
    document.title = 'Artoir | あなたの作品を、展覧会に。'
    return () => { document.title = 'Artoir' }
  }, [])

  useEffect(() => {
    let nextMode = 'skipped'
    try {
      const seen = window.sessionStorage.getItem(INTRO_SEEN_KEY) === 'true'
      const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
      if (seen || reduceMotion) {
        window.sessionStorage.setItem(INTRO_SEEN_KEY, 'true')
        nextMode = 'skipped'
      } else {
        nextMode = 'full'
      }
    } catch {
      nextMode = 'skipped'
    }
    const timer = window.setTimeout(() => setIntroMode(nextMode), 0)
    return () => window.clearTimeout(timer)
  }, [])

  function handleIntroComplete() {
    try {
      window.sessionStorage.setItem(INTRO_SEEN_KEY, 'true')
    } catch { /* ignore */ }
    setIntroMode('skipped')
  }

  return (
    <div className={styles.landingPage}>
      <header className={styles.landingHeader}>
        <Link to="/" className={styles.headerBrand} aria-label="Artoir">
          <BrandLockup />
        </Link>
        <nav className={styles.headerNav} aria-label="ランディングページ">
          <Link to={LANDING_LINKS.viewExhibitions} className="ui-btn ui-btn--ghost">
            <Icon name="list" size={17} />
            <span>展覧会を見る</span>
          </Link>
          <Link
            to={LANDING_LINKS.createExhibition}
            state={{ from: LANDING_LINKS.createAfterLogin }}
            className={styles.headerCta}
          >
            <Icon name="plus" size={16} />
            <span>展示をつくる</span>
          </Link>
        </nav>
      </header>

      {introMode === 'checking' && (
        <div className={styles.landingLoading}>
          <LoadingFrames />
        </div>
      )}
      {introMode === 'full' && <FrameIntro onComplete={handleIntroComplete} />}

      {introMode === 'skipped' && (
        <main className={styles.mainContent}>
          <HorizontalFeatureSection />
          <FinalCTA />
        </main>
      )}
    </div>
  )
}
