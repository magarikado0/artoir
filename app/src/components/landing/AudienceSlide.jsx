import { motion } from 'motion/react'
import { Icon } from '../Header'
import useReducedMotionPreference from '../../hooks/useReducedMotionPreference'
import styles from './landing.module.css'

const MotionDiv = motion.div
const MotionArticle = motion.article

const AUDIENCES = [
  { icon: 'edit', title: '作家', text: '個展を、オンラインでも。' },
  { icon: 'users', title: '美術学生', text: '作品発表を、もっと自由に。' },
  { icon: 'list', title: '写真家', text: '写真を、空間として見せる。' },
  { icon: 'org', title: 'クリエイター', text: 'イラストを、展覧会に。' },
]

export default function AudienceSlide() {
  const prefersReducedMotion = useReducedMotionPreference()

  return (
    <section className={styles.audienceSlide} aria-labelledby="landing-audience-title">
      <MotionDiv
        className={styles.audienceHeader}
        initial={prefersReducedMotion ? false : { opacity: 0, y: 18 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.5 }}
        transition={{ duration: 0.5 }}
      >
        <h2 id="landing-audience-title">作品を見せたい人へ。</h2>
      </MotionDiv>

      <div className={styles.audienceGrid}>
        {AUDIENCES.map((item, index) => (
          <MotionArticle
            key={item.title}
            className={styles.audienceCard}
            initial={prefersReducedMotion ? false : { opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.45 }}
            transition={{ duration: 0.45, delay: index * 0.06 }}
          >
            <span className={styles.audienceIcon}>
              <Icon name={item.icon} size={22} />
            </span>
            <h3>{item.title}</h3>
            <p>{item.text}</p>
          </MotionArticle>
        ))}
      </div>
    </section>
  )
}
