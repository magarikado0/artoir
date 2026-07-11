import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { animate, motion, useMotionValue, useTransform } from 'motion/react'
import { BrandLockup } from '../BrandMark'
import useReducedMotionPreference from '../../hooks/useReducedMotionPreference'
import styles from './landing.module.css'

const INITIAL_ROTATION = -9
const SNAP_DEGREES = 2.5
const AUTO_ALIGN_DELAY = 3400
const MotionButton = motion.button
const MotionDiv = motion.div
const MotionP = motion.p

export default function FrameIntro({ onComplete }) {
  const prefersReducedMotion = useReducedMotionPreference()
  const rotation = useMotionValue(INITIAL_ROTATION)
  const shadow = useTransform(rotation, [-12, 0, 12], ['drop-shadow(-18px 22px 22px rgba(31, 27, 23, 0.2))', 'drop-shadow(0 24px 28px rgba(31, 27, 23, 0.18))', 'drop-shadow(18px 22px 22px rgba(31, 27, 23, 0.2))'])
  const [phase, setPhase] = useState('waiting')
  const [hasInteracted, setHasInteracted] = useState(false)
  const pointerStartRef = useRef({ x: 0, rotation: INITIAL_ROTATION })
  const timersRef = useRef([])

  const clearTimers = useCallback(() => {
    timersRef.current.forEach((timer) => window.clearTimeout(timer))
    timersRef.current = []
  }, [])

  const completeIntro = useCallback(() => {
    clearTimers()
    setPhase('aligned')
    animate(rotation, 0, { type: 'spring', stiffness: 320, damping: 28 })

    const logoTimer = window.setTimeout(() => setPhase('logoAppearing'), prefersReducedMotion ? 120 : 280)
    const enterTimer = window.setTimeout(() => setPhase('logoEnteringFrame'), prefersReducedMotion ? 360 : 940)
    const doneTimer = window.setTimeout(() => {
      setPhase('completed')
      onComplete?.()
    }, prefersReducedMotion ? 900 : 1800)

    timersRef.current.push(logoTimer, enterTimer, doneTimer)
  }, [clearTimers, onComplete, prefersReducedMotion, rotation])

  useEffect(() => () => clearTimers(), [clearTimers])

  useEffect(() => {
    if (prefersReducedMotion) {
      const timer = window.setTimeout(completeIntro, 700)
      timersRef.current.push(timer)
      return undefined
    }

    if (hasInteracted || phase !== 'waiting') return undefined
    const timer = window.setTimeout(completeIntro, AUTO_ALIGN_DELAY)
    timersRef.current.push(timer)
    return () => window.clearTimeout(timer)
  }, [completeIntro, hasInteracted, phase, prefersReducedMotion])

  const currentInstruction = useMemo(() => {
    if (phase === 'dragging') return 'そのまま水平へ。'
    if (phase === 'aligned' || phase === 'logoAppearing' || phase === 'logoEnteringFrame') return 'Artoir.'
    return '額縁をまっすぐにしてください'
  }, [phase])

  const handlePointerDown = (event) => {
    if (phase !== 'waiting' && phase !== 'dragging') return
    clearTimers()
    setHasInteracted(true)
    setPhase('dragging')
    pointerStartRef.current = { x: event.clientX, rotation: rotation.get() }
    event.currentTarget.setPointerCapture?.(event.pointerId)
  }

  const handlePointerMove = (event) => {
    if (phase !== 'dragging') return
    const deltaX = event.clientX - pointerStartRef.current.x
    const nextRotation = Math.max(-14, Math.min(14, pointerStartRef.current.rotation + deltaX * 0.08))
    rotation.set(nextRotation)
    if (Math.abs(nextRotation) <= SNAP_DEGREES) completeIntro()
  }

  const handlePointerUp = () => {
    if (phase !== 'dragging') return
    if (Math.abs(rotation.get()) <= SNAP_DEGREES + 2) {
      completeIntro()
    } else {
      setPhase('waiting')
      animate(rotation, rotation.get() < 0 ? -7 : 7, { type: 'spring', stiffness: 170, damping: 18 })
    }
  }

  return (
    <section className={styles.intro} aria-label="Artoir オープニング">
      <MotionP
        className={styles.introInstruction}
        initial={prefersReducedMotion ? false : { opacity: 0, y: 10 }}
        animate={{ opacity: phase === 'completed' ? 0 : 1, y: 0 }}
      >
        {currentInstruction}
      </MotionP>

      <div className={styles.wall}>
        <MotionButton
          type="button"
          className={styles.frameButton}
          style={{ rotate: rotation, filter: shadow }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          aria-label="額縁をドラッグして水平にする"
          disabled={phase === 'logoEnteringFrame' || phase === 'completed'}
          whileTap={prefersReducedMotion ? undefined : { scale: 0.992 }}
        >
          <span className={styles.frameInner}>
            <span className={styles.frameMat}>
              <span className={styles.frameArt}>
                <MotionDiv
                  className={styles.frameLogo}
                  aria-hidden={phase === 'waiting' || phase === 'dragging'}
                  initial={false}
                  animate={{
                    opacity: ['logoAppearing', 'logoEnteringFrame', 'completed'].includes(phase) ? 1 : 0,
                    scale: phase === 'logoEnteringFrame' || phase === 'completed' ? 1 : 0.92,
                  }}
                  transition={{ duration: prefersReducedMotion ? 0.2 : 0.55, ease: 'easeOut' }}
                >
                  <BrandLockup />
                </MotionDiv>
              </span>
            </span>
          </span>
        </MotionButton>
      </div>
    </section>
  )
}
