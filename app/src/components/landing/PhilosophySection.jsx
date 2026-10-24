import { Link } from 'react-router-dom'
import { motion } from 'motion/react'
import useReducedMotionPreference from '../../hooks/useReducedMotionPreference'
import { LANDING_LINKS } from './landingConfig'
import styles from './landing.module.css'

const MotionDiv = motion.div
const MotionSection = motion.section

// できることを具体的に。読点の代わりに改行で区切る
const PRINCIPLES = [
  ['団体ページに展覧会と', '作品をまとめて公開'],
  ['作品を3D空間に並べて', '歩くように鑑賞'],
  ['個人のプロフィールにも', '作品を掲載できる'],
]

export default function PhilosophySection() {
  const prefersReducedMotion = useReducedMotionPreference()
  const fadeUp = (delay) => ({
    initial: prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 24 },
    animate: { opacity: 1, y: 0 },
    transition: prefersReducedMotion ? { duration: 0.2 } : { delay, duration: 0.7, ease: [0.22, 1, 0.36, 1] },
  })

  return (
    <>
      <section className={styles.philosophySection} aria-labelledby="philosophy-title">
        <img
          className={styles.philosophyBackdrop}
          src="/images/lp-hero-3d.webp"
          alt=""
          aria-hidden="true"
          decoding="async"
          fetchPriority="high"
        />
        <MotionDiv className={styles.philosophyStatement} {...fadeUp(0)}>
          <h1 id="philosophy-title" className={styles.philosophyTitle}>
            <span className={styles.phrase}>展覧会は</span>
            <span className={styles.phrase}>終わっても、</span>
            <br />
            <span className={styles.phrase}>作品との</span>
            <span className={styles.phrase}>出会いは</span>
            <span className={styles.phrase}>残せる。</span>
          </h1>
          <p className={styles.philosophyLead}>
            Artoirは展覧会ごとに作品をまとめて公開できる場所です。
            作品が映える静かな空間で過去の展示を未来の鑑賞へつなぎます。
          </p>

          <div className={styles.philosophyActions}>
            <Link to={LANDING_LINKS.viewExhibitions} className="ui-btn ui-btn--primary">
              展覧会を見る
              <span aria-hidden="true">→</span>
            </Link>
            <Link
              to={LANDING_LINKS.createExhibition}
              state={{ from: LANDING_LINKS.createAfterLogin }}
              className="ui-btn ui-btn--ghost"
            >
              展示をつくる
            </Link>
          </div>
        </MotionDiv>
      </section>

      <MotionSection className={styles.philosophyPrinciplesBand} aria-label="Artoirでできること" {...fadeUp(0.2)}>
        <h2 className={styles.philosophyKicker}>Artoirでできること</h2>
        <div className={styles.philosophyPrinciples}>
          {PRINCIPLES.map((lines, index) => (
            <article key={lines[0]} className={styles.philosophyPrinciple}>
              <span className={styles.principleNumber} aria-hidden="true">{index + 1}</span>
              <h3>
                {lines.map((line) => (
                  <span key={line} className={styles.principleLine}>{line}</span>
                ))}
              </h3>
            </article>
          ))}
        </div>
      </MotionSection>
    </>
  )
}
