import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { LOADING_WORDS } from '../data/content'

type LoadingScreenProps = {
  onComplete: () => void
}

const DURATION_MS = 2700

export function LoadingScreen({ onComplete }: LoadingScreenProps) {
  const [count, setCount] = useState(0)
  const [wordIndex, setWordIndex] = useState(0)

  useEffect(() => {
    const start = performance.now()
    let frame = 0

    const tick = (now: number) => {
      const progress = Math.min((now - start) / DURATION_MS, 1)
      setCount(Math.round(progress * 100))
      if (progress < 1) {
        frame = requestAnimationFrame(tick)
      } else {
        window.setTimeout(onComplete, 400)
      }
    }

    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [onComplete])

  useEffect(() => {
    const interval = window.setInterval(() => {
      setWordIndex((i) => (i + 1) % LOADING_WORDS.length)
    }, 900)
    return () => window.clearInterval(interval)
  }, [])

  return (
    <motion.div
      className="fixed inset-0 z-[9999] flex flex-col bg-pf-bg"
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
    >
      <motion.p
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="absolute left-6 top-6 text-xs uppercase tracking-[0.3em] text-pf-muted md:left-10 md:top-10"
      >
        Portfolio
      </motion.p>

      <div className="flex flex-1 items-center justify-center px-6">
        <AnimatePresence mode="wait">
          <motion.span
            key={LOADING_WORDS[wordIndex]}
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -20, opacity: 0 }}
            transition={{ duration: 0.35 }}
            className="font-display text-4xl italic text-pf-text/80 md:text-6xl lg:text-7xl"
          >
            {LOADING_WORDS[wordIndex]}
          </motion.span>
        </AnimatePresence>
      </div>

      <div className="absolute bottom-24 right-6 md:bottom-28 md:right-10">
        <p className="font-display text-6xl tabular-nums text-pf-text md:text-8xl lg:text-9xl">
          {String(count).padStart(3, '0')}
        </p>
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-pf-stroke/50">
        <div
          className="h-full origin-left accent-gradient"
          style={{
            transform: `scaleX(${count / 100})`,
            boxShadow: '0 0 8px rgba(137, 170, 204, 0.35)',
          }}
        />
      </div>
    </motion.div>
  )
}
