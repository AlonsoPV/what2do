import { useEffect, useState } from 'react'
import { HERO_HLS_URL, HERO_ROLES, NAV_LINKS } from '../data/content'
import { useHlsVideo } from '../hooks/useHlsVideo'
import gsap from 'gsap'

export function HeroSection() {
  const videoRef = useHlsVideo(HERO_HLS_URL)
  const [activeNav, setActiveNav] = useState<(typeof NAV_LINKS)[number]>('Home')
  const [roleIndex, setRoleIndex] = useState(0)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 100)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    const interval = window.setInterval(() => {
      setRoleIndex((i) => (i + 1) % HERO_ROLES.length)
    }, 2000)
    return () => window.clearInterval(interval)
  }, [])

  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } })
      tl.from('.name-reveal', { opacity: 0, y: 50, duration: 1.2, delay: 0.1 })
      tl.from(
        '.blur-in',
        { opacity: 0, filter: 'blur(10px)', y: 20, duration: 1, stagger: 0.1 },
        0.3
      )
    })
    return () => ctx.revert()
  }, [])

  const role = HERO_ROLES[roleIndex]

  return (
    <section id="home" className="relative min-h-screen overflow-hidden">
      <div className="absolute inset-0 overflow-hidden">
        <video
          ref={videoRef}
          autoPlay
          muted
          loop
          playsInline
          className="absolute left-1/2 top-1/2 min-h-full min-w-full -translate-x-1/2 -translate-y-1/2 object-cover"
        />
        <div className="absolute inset-0 bg-black/20" />
        <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-pf-bg to-transparent" />
      </div>

      <header className="fixed left-0 right-0 top-0 z-50 flex justify-center px-4 pt-4 md:pt-6">
        <div
          className={`inline-flex items-center rounded-full border border-white/10 bg-pf-surface px-2 py-2 backdrop-blur-md transition-shadow ${
            scrolled ? 'shadow-md shadow-black/10' : ''
          }`}
        >
          <a
            href="#home"
            className="logo-ring group relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-transform hover:scale-110"
          >
            <span className="flex h-full w-full items-center justify-center rounded-full bg-pf-bg font-display text-[13px] italic">
              JA
            </span>
          </a>

          <span className="mx-1 hidden h-5 w-px bg-pf-stroke md:block" />

          <nav className="flex items-center">
            {NAV_LINKS.map((link) => (
              <button
                key={link}
                type="button"
                onClick={() => {
                  setActiveNav(link)
                  const target =
                    link === 'Work' ? 'work' : link === 'Resume' ? 'contact' : 'home'
                  document.getElementById(target)?.scrollIntoView({ behavior: 'smooth' })
                }}
                className={`rounded-full px-3 py-1.5 text-xs transition-colors sm:px-4 sm:py-2 sm:text-sm ${
                  activeNav === link
                    ? 'bg-pf-stroke/50 text-pf-text'
                    : 'text-pf-muted hover:bg-pf-stroke/50 hover:text-pf-text'
                }`}
              >
                {link}
              </button>
            ))}
          </nav>

          <span className="mx-1 hidden h-5 w-px bg-pf-stroke md:block" />

          <a
            href="#contact"
            className="gradient-border-hover relative rounded-full px-3 py-1.5 text-xs text-pf-text sm:px-4 sm:py-2 sm:text-sm"
          >
            <span className="relative z-10 flex items-center gap-1 rounded-full bg-pf-surface px-2 backdrop-blur-md">
              Say hi <span aria-hidden>↗</span>
            </span>
          </a>
        </div>
      </header>

      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-6 pb-24 pt-32 text-center">
        <p className="blur-in mb-8 text-xs uppercase tracking-[0.3em] text-pf-muted">
          COLLECTION &apos;26
        </p>

        <h1 className="name-reveal mb-6 font-display text-6xl italic leading-[0.9] tracking-tight text-pf-text md:text-8xl lg:text-9xl">
          Michael Smith
        </h1>

        <p className="blur-in mb-12 text-sm text-pf-muted md:text-base">
          A{' '}
          <span key={roleIndex} className="animate-role-fade-in inline-block font-display italic text-pf-text">
            {role}
          </span>{' '}
          lives in Chicago.
        </p>

        <p className="blur-in mb-12 max-w-md text-sm text-pf-muted md:text-base">
          Designing seamless digital interactions by focusing on the unique nuances which bring systems to life.
        </p>

        <div className="blur-in inline-flex flex-wrap justify-center gap-4">
          <a
            href="#work"
            className="gradient-border-hover rounded-full bg-pf-text px-7 py-3.5 text-sm text-pf-bg transition-all hover:scale-105 hover:bg-pf-bg hover:text-pf-text"
          >
            See Works
          </a>
          <a
            href="#contact"
            className="gradient-border-hover rounded-full border-2 border-pf-stroke bg-pf-bg px-7 py-3.5 text-sm text-pf-text transition-all hover:scale-105 hover:border-transparent"
          >
            Reach out...
          </a>
        </div>
      </div>

      <div className="absolute bottom-8 left-1/2 z-10 flex -translate-x-1/2 flex-col items-center gap-3">
        <span className="text-xs uppercase tracking-[0.2em] text-pf-muted">Scroll</span>
        <div className="relative h-10 w-px overflow-hidden bg-pf-stroke">
          <div className="absolute left-0 top-0 h-1/2 w-full accent-gradient animate-scroll-down" />
        </div>
      </div>
    </section>
  )
}
