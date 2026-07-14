import { Link } from 'react-router-dom'
import { motion } from 'motion/react'
import { BrandLockup } from '../BrandMark'
import { Icon } from '../Header'
import useReducedMotionPreference from '../../hooks/useReducedMotionPreference'
import { LANDING_LINKS } from './landingConfig'
import styles from './landing.module.css'

const MotionDiv = motion.div

export default function FinalCTA() {
  const prefersReducedMotion = useReducedMotionPreference()

  return (
    <section className={styles.finalCta} aria-labelledby="landing-final-title">
      <div className={styles.finalBackdrop} aria-hidden="true" />
      <MotionDiv
        className={styles.finalContent}
        initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.55 }}
        transition={{ duration: 0.6 }}
      >
        <h2 id="landing-final-title" className={styles.finalTitle}>
          <span>展覧会アーカイブサイト</span>
          <span className={styles.finalBrandLine}>
            <BrandLockup />
          </span>
        </h2>
        <div className={styles.finalActions}>
          <Link to={LANDING_LINKS.viewExhibitions} className="ui-btn ui-btn--ghost">
            <Icon name="list" size={17} />
            <span>展覧会を見る</span>
          </Link>
          <Link
            to={LANDING_LINKS.createExhibition}
            state={{ from: LANDING_LINKS.createAfterLogin }}
            className="ui-btn ui-btn--accent"
          >
            <Icon name="plus" size={17} />
            <span>展示をつくる</span>
          </Link>
          <a
            href="https://www.instagram.com/artoir_net/"
            target="_blank"
            rel="noreferrer"
            className="ui-btn ui-btn--ghost"
            aria-label="Artoir の Instagram を開く"
          >
            <span className={styles.instagramIcon} aria-hidden="true" />
            <span>Instagram</span>
          </a>
        </div>
      </MotionDiv>
    </section>
  )
}
