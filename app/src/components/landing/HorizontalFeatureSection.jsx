import { motion } from 'motion/react'
import useHorizontalScrollProgress from '../../hooks/useHorizontalScrollProgress'
import useReducedMotionPreference from '../../hooks/useReducedMotionPreference'
import AudienceSlide from './AudienceSlide'
import FeatureVideoSlide from './FeatureVideoSlide'
import { LANDING_MEDIA } from './landingConfig'
import styles from './landing.module.css'

const MotionDiv = motion.div

const SLIDES = [
  {
    key: 'create',
    component: (
      <FeatureVideoSlide
        label="Create"
        title="展覧会が、組み上がる。"
        description="タイトルを決め、空間を選び、作品を並べる。"
        alignment="left"
        {...LANDING_MEDIA.createExhibition}
      />
    ),
  },
  {
    key: 'artwork',
    component: (
      <FeatureVideoSlide
        label="Artwork"
        title="加えるだけで、飾られる。"
        description="作品を追加すると、展示空間へ反映されます。"
        alignment="right"
        {...LANDING_MEDIA.addArtwork}
      />
    ),
  },
  {
    key: 'gallery',
    component: (
      <FeatureVideoSlide
        label="3D Gallery"
        title="歩くように、鑑賞する。"
        description="録画済みの展示空間ツアーで、空間の広がりを伝えます。"
        alignment="left"
        tone="dark"
        {...LANDING_MEDIA.galleryTour}
      />
    ),
  },
  { key: 'audience', component: <AudienceSlide /> },
]

export default function HorizontalFeatureSection() {
  const prefersReducedMotion = useReducedMotionPreference()
  const { targetRef, x } = useHorizontalScrollProgress(SLIDES.length)

  if (prefersReducedMotion) {
    return (
      <div className={styles.reducedFeatureStack}>
        {SLIDES.map((slide) => (
          <div key={slide.key}>{slide.component}</div>
        ))}
      </div>
    )
  }

  return (
    <section
      ref={targetRef}
      className={styles.horizontalSection}
      aria-label="Artoir の主な体験"
    >
      <div className={styles.stickyViewport}>
        <MotionDiv
          className={styles.slideTrack}
          style={{ x, width: `${SLIDES.length * 100}%` }}
        >
          {SLIDES.map((slide) => (
            <div key={slide.key} className={styles.trackItem}>
              {slide.component}
            </div>
          ))}
        </MotionDiv>
      </div>
    </section>
  )
}
