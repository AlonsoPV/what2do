import { motion } from 'framer-motion'
import { STATS } from '../data/content'

const viewport = { once: true, margin: '-80px' }

export function StatsSection() {
  return (
    <section className="bg-pf-bg py-16 md:py-24">
      <div className="mx-auto grid max-w-[1200px] grid-cols-1 gap-10 px-6 md:grid-cols-3 md:gap-8 md:px-10 lg:px-16">
        {STATS.map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: index * 0.1 }}
            viewport={viewport}
            className="border-t border-pf-stroke pt-8 text-center md:text-left"
          >
            <p className="font-display text-5xl italic text-pf-text md:text-6xl lg:text-7xl">{stat.value}</p>
            <p className="mt-2 text-sm uppercase tracking-[0.15em] text-pf-muted">{stat.label}</p>
          </motion.div>
        ))}
      </div>
    </section>
  )
}
