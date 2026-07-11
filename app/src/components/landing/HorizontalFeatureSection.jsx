import { useState } from 'react'
import useReducedMotionPreference from '../../hooks/useReducedMotionPreference'
import { LANDING_MEDIA } from './landingConfig'
import styles from './landing.module.css'

const WINDOWS = [
  {
    key: 'organization',
    label: 'ORGANIZATION',
    title: '団体をつくる',
    ...LANDING_MEDIA.createOrganization,
  },
  {
    key: 'exhibition',
    label: 'CREATE',
    title: '展覧会をつくる',
    ...LANDING_MEDIA.createExhibition,
  },
  {
    key: 'gallery',
    label: '3D GALLERY',
    title: '3D空間',
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
  const [hasVideoError, setHasVideoError] = useState(false)
  const isStaticImage = item.mediaType === 'image'

  return (
    <article
      className={`${styles.videoWindow} ${isStaticImage ? styles.staticImageWindow : ''}`}
      tabIndex={0}
      aria-label={`${item.label}: ${item.title}`}
    >
      {!isStaticImage && !hasVideoError && !prefersReducedMotion && (
        <video
          className={styles.windowVideo}
          src={item.mobileVideoSrc ? undefined : item.videoSrc}
          poster={item.posterSrc}
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          aria-hidden="true"
          onError={() => setHasVideoError(true)}
        >
          {item.mobileVideoSrc && (
            <>
              <source src={item.mobileVideoSrc} media="(max-width: 720px)" type="video/mp4" />
              <source src={item.videoSrc} type="video/mp4" />
            </>
          )}
        </video>
      )}
      <picture>
        {item.mobilePosterSrc && (
          <source media="(max-width: 900px)" srcSet={item.mobilePosterSrc} />
        )}
        <img
          className={`${styles.windowPoster} ${isStaticImage ? styles.staticWindowImage : ''}`}
          src={item.posterSrc}
          alt=""
          loading="lazy"
          decoding="async"
          aria-hidden="true"
          onError={(event) => {
            event.currentTarget.style.display = 'none'
          }}
        />
      </picture>
      {!isStaticImage && <div className={styles.windowFallback} aria-hidden="true" />}
      <div className={styles.windowOverlay}>
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
