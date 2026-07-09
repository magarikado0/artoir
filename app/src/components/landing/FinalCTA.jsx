import { Link } from 'react-router-dom'
import { useEffect, useRef, useState } from 'react'
import { motion } from 'motion/react'
import { BrandLockup } from '../BrandMark'
import { Icon } from '../Header'
import useVideoVisibility from '../../hooks/useVideoVisibility'
import useReducedMotionPreference from '../../hooks/useReducedMotionPreference'
import { LANDING_LINKS, LANDING_MEDIA } from './landingConfig'
import styles from './landing.module.css'

const MotionDiv = motion.div

export default function FinalCTA() {
  const videoRef = useRef(null)
  const [hasVideoError, setHasVideoError] = useState(false)
  const { ref, isVisible } = useVideoVisibility({ threshold: 0.35 })
  const prefersReducedMotion = useReducedMotionPreference()

  useEffect(() => {
    const video = videoRef.current
    if (!video || hasVideoError || prefersReducedMotion) return undefined
    if (isVisible) {
      const playPromise = video.play()
      if (playPromise?.catch) playPromise.catch(() => {})
    } else {
      video.pause()
    }
    return undefined
  }, [hasVideoError, isVisible, prefersReducedMotion])

  return (
    <section ref={ref} className={styles.finalCta} aria-labelledby="landing-final-title">
      {!hasVideoError && !prefersReducedMotion && (
        <video
          ref={videoRef}
          className={styles.finalVideo}
          poster={LANDING_MEDIA.final.posterSrc}
          muted
          loop
          playsInline
          preload="metadata"
          aria-hidden="true"
          onError={() => setHasVideoError(true)}
        >
          <source src={LANDING_MEDIA.final.mobileVideoSrc} media="(max-width: 720px)" type="video/mp4" />
          <source src={LANDING_MEDIA.final.videoSrc} type="video/mp4" />
        </video>
      )}
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
          <Link to={LANDING_LINKS.createExhibition} className="ui-btn ui-btn--accent">
            <Icon name="plus" size={17} />
            <span>展覧会を作成</span>
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
