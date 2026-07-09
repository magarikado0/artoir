import { useScroll, useTransform } from 'motion/react'
import { useRef } from 'react'

export default function useHorizontalScrollProgress(slideCount) {
  const targetRef = useRef(null)
  const { scrollYProgress } = useScroll({
    target: targetRef,
    offset: ['start start', 'end end'],
  })

  const distance = Math.max(0, slideCount - 1) * 100
  const x = useTransform(scrollYProgress, [0, 1], ['0%', `-${distance}%`])

  return { targetRef, scrollYProgress, x }
}
