import { motion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import { JOURNAL_ENTRIES } from '../data/content'

const viewport = { once: true, margin: '-100px' }

export function JournalSection() {
  return (
    <section className="bg-pf-bg py-16 md:py-24">
      <div className="mx-auto max-w-[1200px] px-6 md:px-10 lg:px-16">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: [0.25, 0.1, 0.25, 1] }}
          viewport={viewport}
          className="mb-10 flex flex-col gap-6 md:mb-14 md:flex-row md:items-end md:justify-between"
        >
          <div>
            <div className="mb-4 flex items-center gap-3">
              <span className="h-px w-8 bg-pf-stroke" />
              <span className="text-xs uppercase tracking-[0.3em] text-pf-muted">Journal</span>
            </div>
            <h2 className="text-3xl font-medium text-pf-text md:text-5xl">
              Recent <span className="font-display italic">thoughts</span>
            </h2>
            <p className="mt-3 max-w-lg text-sm text-pf-muted md:text-base">
              Notes on design, engineering, and the craft of building products.
            </p>
          </div>
          <button
            type="button"
            className="gradient-border-hover hidden items-center gap-2 rounded-full border border-pf-stroke px-6 py-3 text-sm text-pf-text md:inline-flex"
          >
            View all <ArrowRight className="h-4 w-4" />
          </button>
        </motion.div>

        <div className="flex flex-col gap-4">
          {JOURNAL_ENTRIES.map((entry, index) => (
            <motion.a
              key={entry.title}
              href="#"
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: index * 0.06 }}
              viewport={viewport}
              className="flex flex-col items-stretch gap-4 rounded-[40px] border border-pf-stroke bg-pf-surface/30 p-4 transition-colors hover:bg-pf-surface sm:flex-row sm:items-center sm:rounded-full sm:gap-6"
            >
              <img
                src={entry.image}
                alt=""
                loading="lazy"
                className="h-20 w-full shrink-0 rounded-3xl object-cover sm:h-16 sm:w-16 sm:rounded-full"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-base font-medium text-pf-text md:text-lg">{entry.title}</p>
                <p className="text-xs text-pf-muted sm:text-sm">
                  {entry.readTime} · {entry.date}
                </p>
              </div>
              <ArrowRight className="hidden h-5 w-5 shrink-0 text-pf-muted sm:block" />
            </motion.a>
          ))}
        </div>
      </div>
    </section>
  )
}
