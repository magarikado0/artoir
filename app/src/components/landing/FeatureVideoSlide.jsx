import { useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'motion/react'
import useVideoVisibility from '../../hooks/useVideoVisibility'
import useReducedMotionPreference from '../../hooks/useReducedMotionPreference'
import styles from './landing.module.css'

const MotionDiv = motion.div

export default function FeatureVideoSlide({
  title,
  description,
  videoSrc,
  mobileVideoSrc,
  posterSrc,
  alignment = 'left',
  tone = 'light',
  label,
}) {
  const videoRef = useRef(null)
  const [hasVideoError, setHasVideoError] = useState(false)
  const { ref: sectionRef, isVisible } = useVideoVisibility({ threshold: 0.4 })
  const prefersReducedMotion = useReducedMotionPreference()

  const source = useMemo(() => ({
    desktop: videoSrc,
    mobile: mobileVideoSrc || videoSrc,
  }), [mobileVideoSrc, videoSrc])

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
    <section
      ref={sectionRef}
      className={`${styles.videoSlide} ${styles[`videoSlide${alignment === 'right' ? 'Right' : 'Left'}`]} ${styles[`tone${tone === 'dark' ? 'Dark' : 'Light'}`]}`}
      aria-label={title}
    >
      <MotionDiv
        className={styles.slideCopy}
        initial={prefersReducedMotion ? false : { opacity: 0, y: 18 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.45 }}
        transition={{ duration: 0.55, ease: 'easeOut' }}
      >
        {label && <p className={styles.kicker}>{label}</p>}
        <h2>{title}</h2>
        <p>{description}</p>
      </MotionDiv>

      <MotionDiv
        className={styles.videoShell}
        initial={prefersReducedMotion ? false : { opacity: 0, scale: 0.975 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true, amount: 0.35 }}
        transition={{ duration: 0.7, ease: 'easeOut' }}
      >
        {!hasVideoError && !prefersReducedMotion ? (
          <video
            ref={videoRef}
            className={styles.featureVideo}
            poster={posterSrc}
            muted
            loop
            playsInline
            preload="metadata"
            aria-label={`${title} のデモ動画`}
            onError={() => setHasVideoError(true)}
          >
            <source src={source.mobile} media="(max-width: 720px)" type="video/mp4" />
            <source src={source.desktop} type="video/mp4" />
          </video>
        ) : (
          <img
            className={styles.featureVideo}
            src={posterSrc}
            alt={`${title} のプレビュー`}
            loading="lazy"
            decoding="async"
            onError={(event) => {
              event.currentTarget.style.display = 'none'
            }}
          />
        )}
        <div className={styles.videoFallback} aria-hidden="true">
          <span>{title}</span>
        </div>
      </MotionDiv>
    </section>
  )
}
