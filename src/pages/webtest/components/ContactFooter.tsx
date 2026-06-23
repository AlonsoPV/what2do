import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import { HERO_HLS_URL, SOCIAL_LINKS } from '../data/content'
import { useHlsVideo } from '../hooks/useHlsVideo'

export function ContactFooter() {
  const marqueeRef = useRef<HTMLDivElement>(null)
  const videoRef = useHlsVideo(HERO_HLS_URL)

  useEffect(() => {
    const el = marqueeRef.current
    if (!el) return

    const tween = gsap.to(el, {
      xPercent: -50,
      duration: 40,
      ease: 'none',
      repeat: -1,
    })

    return () => {
      tween.kill()
    }
  }, [])

  const marqueeText = Array.from({ length: 10 }, () => 'BUILDING THE FUTURE • ').join('')

  return (
    <footer id="contact" className="relative overflow-hidden bg-pf-bg pb-8 pt-16 md:pb-12 md:pt-20">
      <div className="absolute inset-0 overflow-hidden">
        <video
          ref={videoRef}
          autoPlay
          muted
          loop
          playsInline
          className="absolute left-1/2 top-1/2 min-h-full min-w-full -translate-x-1/2 -translate-y-1/2 scale-y-[-1] object-cover"
        />
        <div className="absolute inset-0 bg-black/60" />
      </div>

      <div className="relative z-10 overflow-hidden border-y border-pf-stroke/40 py-6">
        <div ref={marqueeRef} className="flex whitespace-nowrap will-change-transform">
          <span className="px-4 font-display text-4xl italic text-pf-text/90 md:text-6xl">{marqueeText}</span>
          <span className="px-4 font-display text-4xl italic text-pf-text/90 md:text-6xl" aria-hidden>
            {marqueeText}
          </span>
        </div>
      </div>

      <div className="relative z-10 flex flex-col items-center px-6 py-16 text-center md:py-24">
        <p className="mb-6 text-xs uppercase tracking-[0.3em] text-pf-muted">Let&apos;s collaborate</p>
        <a
          href="mailto:hello@michaelsmith.com"
          className="gradient-border-hover rounded-full bg-pf-text px-10 py-4 text-lg text-pf-bg transition-transform hover:scale-105 hover:bg-pf-bg hover:text-pf-text md:text-2xl"
        >
          hello@michaelsmith.com
        </a>
      </div>

      <div className="relative z-10 mx-auto flex max-w-[1200px] flex-col items-center justify-between gap-6 border-t border-pf-stroke/40 px-6 pt-8 md:flex-row md:px-10 lg:px-16">
        <div className="flex flex-wrap justify-center gap-6 text-sm text-pf-muted">
          {SOCIAL_LINKS.map((link) => (
            <a key={link} href="#" className="transition-colors hover:text-pf-text">
              {link}
            </a>
          ))}
        </div>
        <div className="flex items-center gap-2 text-sm text-pf-muted">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-60" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-green-500" />
          </span>
          Available for projects
        </div>
      </div>
    </footer>
  )
}
