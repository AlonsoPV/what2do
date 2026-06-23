import { useEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { EXPLORATION_ITEMS } from '../data/content'

gsap.registerPlugin(ScrollTrigger)

export function ExplorationsSection() {
  const sectionRef = useRef<HTMLElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const col1Ref = useRef<HTMLDivElement>(null)
  const col2Ref = useRef<HTMLDivElement>(null)
  const [lightbox, setLightbox] = useState<string | null>(null)

  const col1Items = EXPLORATION_ITEMS.filter((_, i) => i % 2 === 0)
  const col2Items = EXPLORATION_ITEMS.filter((_, i) => i % 2 === 1)

  useEffect(() => {
    const section = sectionRef.current
    const content = contentRef.current
    const col1 = col1Ref.current
    const col2 = col2Ref.current
    if (!section || !content || !col1 || !col2) return

    const pin = ScrollTrigger.create({
      trigger: content,
      start: 'top top',
      end: () => `+=${section.offsetHeight - window.innerHeight}`,
      pin: content,
      pinSpacing: false,
    })

    const parallax1 = gsap.to(col1, {
      y: -280,
      ease: 'none',
      scrollTrigger: {
        trigger: section,
        start: 'top bottom',
        end: 'bottom top',
        scrub: true,
      },
    })

    const parallax2 = gsap.to(col2, {
      y: 280,
      ease: 'none',
      scrollTrigger: {
        trigger: section,
        start: 'top bottom',
        end: 'bottom top',
        scrub: true,
      },
    })

    return () => {
      pin.kill()
      parallax1.scrollTrigger?.kill()
      parallax2.scrollTrigger?.kill()
    }
  }, [])

  return (
    <>
      <section ref={sectionRef} className="relative min-h-[300vh] bg-pf-bg">
        <div ref={contentRef} className="relative z-10 flex h-screen flex-col items-center justify-center px-6 text-center">
          <div className="mb-4 flex items-center justify-center gap-3">
            <span className="h-px w-8 bg-pf-stroke" />
            <span className="text-xs uppercase tracking-[0.3em] text-pf-muted">Explorations</span>
            <span className="h-px w-8 bg-pf-stroke" />
          </div>
          <h2 className="mb-4 text-4xl font-medium text-pf-text md:text-6xl">
            Visual <span className="font-display italic">playground</span>
          </h2>
          <p className="mb-8 max-w-md text-sm text-pf-muted md:text-base">
            Experiments in form, color, and motion — shared on Dribbble.
          </p>
          <a
            href="https://dribbble.com"
            target="_blank"
            rel="noopener noreferrer"
            className="gradient-border-hover rounded-full border border-pf-stroke px-7 py-3 text-sm text-pf-text transition-transform hover:scale-105"
          >
            Dribbble ↗
          </a>
        </div>

        <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center px-6 md:px-16">
          <div className="grid w-full max-w-[1400px] grid-cols-2 gap-12 md:gap-40">
            <div ref={col1Ref} className="flex flex-col items-end gap-16 pt-32">
              {col1Items.map((item) => (
                <button
                  key={item.image}
                  type="button"
                  style={{ transform: `rotate(${item.rotation}deg)` }}
                  onClick={() => setLightbox(item.image)}
                  className="pointer-events-auto aspect-square w-full max-w-[320px] overflow-hidden rounded-3xl border border-pf-stroke bg-pf-surface shadow-2xl transition-transform hover:scale-105"
                >
                  <img src={item.image} alt="" className="h-full w-full object-cover" loading="lazy" />
                </button>
              ))}
            </div>
            <div ref={col2Ref} className="flex flex-col items-start gap-16 pb-32">
              {col2Items.map((item) => (
                <button
                  key={item.image}
                  type="button"
                  style={{ transform: `rotate(${item.rotation}deg)` }}
                  onClick={() => setLightbox(item.image)}
                  className="pointer-events-auto aspect-square w-full max-w-[320px] overflow-hidden rounded-3xl border border-pf-stroke bg-pf-surface shadow-2xl transition-transform hover:scale-105"
                >
                  <img src={item.image} alt="" className="h-full w-full object-cover" loading="lazy" />
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {lightbox ? (
        <button
          type="button"
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-6"
          onClick={() => setLightbox(null)}
          aria-label="Close lightbox"
        >
          <img src={lightbox} alt="" className="max-h-[90vh] max-w-full rounded-2xl object-contain" />
        </button>
      ) : null}
    </>
  )
}
