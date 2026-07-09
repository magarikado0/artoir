import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence } from 'motion/react'
import { BrandLockup } from '../BrandMark'
import { Icon } from '../Header'
import FrameIntro from './FrameIntro'
import HorizontalFeatureSection from './HorizontalFeatureSection'
import FinalCTA from './FinalCTA'
import { LANDING_LINKS } from './landingConfig'
import styles from './landing.module.css'

export default function LandingPage() {
  const [introComplete, setIntroComplete] = useState(false)
  const contentRef = useRef(null)

  useEffect(() => {
    document.title = 'Artoir | あなたの作品を、展覧会に。'
    return () => { document.title = 'Artoir' }
  }, [])

  useEffect(() => {
    if (!introComplete) return
    const timer = window.setTimeout(() => {
      contentRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 140)
    return () => window.clearTimeout(timer)
  }, [introComplete])

  return (
    <div className={styles.landingPage}>
      <header className={styles.landingHeader}>
        <Link to="/lp" className={styles.headerBrand} aria-label="Artoir LP">
          <BrandLockup />
        </Link>
        <nav className={styles.headerNav} aria-label="ランディングページ">
          <Link to={LANDING_LINKS.viewExhibitions} className="ui-btn ui-btn--ghost">
            <Icon name="list" size={17} />
            <span>展覧会を見る</span>
          </Link>
          <Link to={LANDING_LINKS.createExhibition} className={styles.headerCta}>
            <Icon name="plus" size={16} />
            <span>展覧会を作成</span>
          </Link>
        </nav>
      </header>

      <AnimatePresence>
        {!introComplete && (
          <div
            key="intro"
          >
            <FrameIntro onComplete={() => setIntroComplete(true)} />
          </div>
        )}
      </AnimatePresence>

      <main ref={contentRef} className={styles.mainContent}>
        <HorizontalFeatureSection />
        <FinalCTA />
      </main>
    </div>
  )
}
