import { useRef, useState } from 'react'
import useReducedMotionPreference from '../../hooks/useReducedMotionPreference'
import { LANDING_MEDIA } from './landingConfig'
import styles from './landing.module.css'

const WINDOWS = [
  {
    key: 'create',
    label: 'CREATE',
    title: '展覧会をつくる',
    ...LANDING_MEDIA.createExhibition,
  },
  {
    key: 'artwork',
    label: 'ARTWORK',
    title: '作品を加える',
    ...LANDING_MEDIA.addArtwork,
  },
  {
    key: 'gallery',
    label: '3D GALLERY',
    title: '空間で見せる',
    ...LANDING_MEDIA.galleryTour,
  },
  {
    key: 'creators',
    label: 'FOR CREATORS',
    title: '作品を見せたい人へ',
    ...LANDING_MEDIA.forCreators,
  },
]

function VideoWindow({ item, prefersReducedMotion }) {
  const videoRef = useRef(null)
  const [hasVideoError, setHasVideoError] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)

  const play = () => {
    if (prefersReducedMotion || hasVideoError) return
    const video = videoRef.current
    if (!video) return
    const playPromise = video.play()
    if (playPromise?.catch) playPromise.catch(() => {})
    setIsPlaying(true)
  }

  const pause = () => {
    const video = videoRef.current
    if (!video) return
    video.pause()
    setIsPlaying(false)
  }

  return (
    <article
      className={`${styles.videoWindow} ${isPlaying ? styles.videoWindowPlaying : ''}`}
      tabIndex={0}
      onMouseEnter={play}
      onMouseLeave={pause}
      onFocus={play}
      onBlur={pause}
      onTouchStart={play}
      aria-label={`${item.label}: ${item.title}`}
    >
      {!hasVideoError && !prefersReducedMotion && (
        <video
          ref={videoRef}
          className={styles.windowVideo}
          poster={item.posterSrc}
          muted
          loop
          playsInline
          preload="metadata"
          aria-hidden="true"
          onError={() => setHasVideoError(true)}
        >
          <source src={item.mobileVideoSrc || item.videoSrc} media="(max-width: 720px)" type="video/mp4" />
          <source src={item.videoSrc} type="video/mp4" />
        </video>
      )}
      <img
        className={styles.windowPoster}
        src={item.posterSrc}
        alt=""
        loading="lazy"
        decoding="async"
        aria-hidden="true"
        onError={(event) => {
          event.currentTarget.style.display = 'none'
        }}
      />
      <div className={styles.windowFallback} aria-hidden="true" />
      <div className={styles.windowOverlay}>
        <span>{item.label}</span>
        <strong>{item.title}</strong>
      </div>
    </article>
  )
}

export default function HorizontalFeatureSection() {
  const prefersReducedMotion = useReducedMotionPreference()

  return (
    <section
      className={styles.videoWindowSection}
      aria-label="Artoir の動画デモ"
    >
      <div className={styles.videoWindowGrid}>
        {WINDOWS.map((item) => (
          <VideoWindow key={item.key} item={item} prefersReducedMotion={prefersReducedMotion} />
        ))}
      </div>
    </section>
  )
}
