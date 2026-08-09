import { Link } from 'react-router-dom'
import { motion } from 'motion/react'
import useReducedMotionPreference from '../../hooks/useReducedMotionPreference'
import { LANDING_LINKS } from './landingConfig'
import styles from './landing.module.css'

const MotionSection = motion.section
const MotionDiv = motion.div

const PRINCIPLES = [
  {
    title: 'みんなの展示を、ひとつの場所に。',
    body: '団体・展覧会・作品をまとめて、すぐに公開。',
  },
  {
    title: '会場の空気まで、オンラインへ。',
    body: '作品を3D空間に並べて、歩くように鑑賞。',
  },
  {
    title: 'ひとりの作品にも、ひとつの展示室を。',
    body: '作家プロフィールから、作品をまとめて発信。',
  },
]

export default function PhilosophySection() {
  const prefersReducedMotion = useReducedMotionPreference()
  const revealTransition = prefersReducedMotion
    ? { duration: 0.2 }
    : { duration: 0.9, ease: [0.22, 1, 0.36, 1] }

  return (
    <MotionSection
      className={styles.philosophySection}
      aria-labelledby="philosophy-title"
      initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.965, filter: 'blur(18px)' }}
      animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
      transition={revealTransition}
      style={{ transformOrigin: '50% 32%' }}
    >
      <MotionDiv
        className={styles.philosophyStatement}
        initial={prefersReducedMotion ? false : { opacity: 0, y: 44 }}
        animate={{ opacity: 1, y: 0 }}
        transition={prefersReducedMotion ? { duration: 0.2 } : { delay: 0.16, duration: 0.78, ease: [0.22, 1, 0.36, 1] }}
      >
        <h1 id="philosophy-title" className={styles.philosophyTitle}>
          展覧会は終わっても、<br />
          作品との出会いは残せる。
        </h1>
        <p className={styles.philosophyLead}>
          Artoirは、展覧会ごとに作品をまとめ、ひとつの記憶として公開できる場所です。
          作品が映える静かな空間をつくり、過去の展示を未来の鑑賞へつなぎます。
        </p>

        <div className={styles.philosophyActions}>
          <Link to={LANDING_LINKS.viewExhibitions} className={styles.philosophyPrimaryAction}>
            展覧会を見る
            <span aria-hidden="true">→</span>
          </Link>
          <Link
            to={LANDING_LINKS.createExhibition}
            state={{ from: LANDING_LINKS.createAfterLogin }}
            className={styles.philosophyTextAction}
          >
            展示をつくる
          </Link>
        </div>
      </MotionDiv>

      <motion.aside
        className={styles.philosophyAside}
        aria-label="Artoirが大切にすること"
        initial={prefersReducedMotion ? false : { opacity: 0, x: 34 }}
        animate={{ opacity: 1, x: 0 }}
        transition={prefersReducedMotion ? { duration: 0.2 } : { delay: 0.34, duration: 0.72, ease: [0.22, 1, 0.36, 1] }}
      >
        <p className={styles.philosophyVertical}>作品を、展覧会の記憶とともに。</p>
        <div className={styles.philosophyPrinciples}>
          {PRINCIPLES.map((principle) => (
            <article key={principle.title} className={styles.philosophyPrinciple}>
              <h2>{principle.title}</h2>
              <p>{principle.body}</p>
            </article>
          ))}
        </div>
      </motion.aside>
    </MotionSection>
  )
}
