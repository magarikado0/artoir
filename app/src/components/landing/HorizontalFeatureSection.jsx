import { useEffect, useRef, useState } from 'react'
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
  const videoRef = useRef(null)
  const [hasVideoError, setHasVideoError] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isMobileVideo, setIsMobileVideo] = useState(() => (
    typeof window !== 'undefined' && window.matchMedia('(max-width: 900px)').matches
  ))
  const videoSrc = isMobileVideo && item.mobileVideoSrc ? item.mobileVideoSrc : item.videoSrc
  const showVideo = !hasVideoError && !prefersReducedMotion

  useEffect(() => {
    const media = window.matchMedia('(max-width: 900px)')
    const handleChange = () => {
      setIsMobileVideo(media.matches)
      setHasVideoError(false)
    }
    handleChange()
    media.addEventListener('change', handleChange)
    return () => media.removeEventListener('change', handleChange)
  }, [])

  // 画面内にある間だけ再生する
  useEffect(() => {
    const video = videoRef.current
    if (!video || !showVideo) return undefined
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        video.play().catch(() => {})
      } else {
        video.pause()
      }
    }, { threshold: 0.25 })
    observer.observe(video)
    return () => observer.disconnect()
  }, [showVideo, videoSrc])

  return (
    <article
      className={`${styles.videoWindow} ${isPlaying ? styles.videoWindowPlaying : ''}`}
      tabIndex={0}
      aria-label={`${item.label}: ${item.title}`}
    >
      {showVideo && (
        <video
          ref={videoRef}
          key={videoSrc}
          className={styles.windowVideo}
          src={videoSrc}
          poster={item.posterSrc}
          muted
          loop
          playsInline
          preload="metadata"
          aria-hidden="true"
          onPlaying={() => setIsPlaying(true)}
          onError={() => setHasVideoError(true)}
        />
      )}
      <picture>
        {item.mobilePosterSrc && (
          <source media="(max-width: 900px)" srcSet={item.mobilePosterSrc} />
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
      </picture>
      <div className={styles.windowFallback} aria-hidden="true" />
      <div className={styles.windowOverlay}>
        <strong>{item.title}</strong>
      </div>
    </article>
  )
}

export default function HorizontalFeatureSection() {
  const prefersReducedMotion = useReducedMotionPreference()
  const gridRef = useRef(null)
  const [activeIndex, setActiveIndex] = useState(0)

  // スマホの横スワイプ時、いま見えているカードをドットに反映する
  const handleScroll = () => {
    const grid = gridRef.current
    if (!grid) return
    const cards = [...grid.children]
    const left = grid.scrollLeft
    let nearest = 0
    cards.forEach((card, index) => {
      if (Math.abs(card.offsetLeft - grid.offsetLeft - left) < Math.abs(cards[nearest].offsetLeft - grid.offsetLeft - left)) {
        nearest = index
      }
    })
    setActiveIndex(nearest)
  }

  const scrollToCard = (index) => {
    const grid = gridRef.current
    const card = grid?.children[index]
    if (!card) return
    grid.scrollTo({ left: card.offsetLeft - grid.offsetLeft - 20, behavior: prefersReducedMotion ? 'auto' : 'smooth' })
  }

  return (
    <section
      className={styles.videoWindowSection}
      aria-label="Artoir の動画デモ"
    >
      <div ref={gridRef} className={styles.videoWindowGrid} onScroll={handleScroll}>
        {WINDOWS.map((item) => (
          <VideoWindow key={item.key} item={item} prefersReducedMotion={prefersReducedMotion} />
        ))}
      </div>
      <div className={styles.videoDots}>
        {WINDOWS.map((item, index) => (
          <button
            key={item.key}
            type="button"
            className={index === activeIndex ? styles.videoDotActive : styles.videoDot}
            aria-label={`${item.title}の動画を表示`}
            aria-current={index === activeIndex}
            onClick={() => scrollToCard(index)}
          />
        ))}
      </div>
    </section>
  )
}
