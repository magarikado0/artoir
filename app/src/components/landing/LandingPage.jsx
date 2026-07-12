import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { BrandLockup } from '../BrandMark'
import { Icon } from '../Header'
import FrameIntro from './FrameIntro'
import HorizontalFeatureSection from './HorizontalFeatureSection'
import FinalCTA from './FinalCTA'
import { LANDING_LINKS } from './landingConfig'
import styles from './landing.module.css'

export default function LandingPage() {
  const [introMode, setIntroMode] = useState('full')

  useEffect(() => {
    document.title = 'Artoir | あなたの作品を、展覧会に。'
    return () => { document.title = 'Artoir' }
  }, [])

  function handleIntroComplete() {
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
