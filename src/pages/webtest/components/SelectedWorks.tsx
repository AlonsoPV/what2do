import { motion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import { PROJECTS } from '../data/content'

const viewport = { once: true, margin: '-100px' }

export function SelectedWorks() {
  return (
    <section id="work" className="bg-pf-bg py-12 md:py-16">
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
              <span className="text-xs uppercase tracking-[0.3em] text-pf-muted">Selected Work</span>
            </div>
            <h2 className="text-3xl font-medium text-pf-text md:text-5xl">
              Featured <span className="font-display italic">projects</span>
            </h2>
            <p className="mt-3 max-w-lg text-sm text-pf-muted md:text-base">
              A selection of projects I&apos;ve worked on, from concept to launch.
            </p>
          </div>
          <button
            type="button"
            className="gradient-border-hover hidden items-center gap-2 rounded-full border border-pf-stroke px-6 py-3 text-sm text-pf-text transition-transform hover:scale-105 md:inline-flex"
          >
            View all work <ArrowRight className="h-4 w-4" />
          </button>
        </motion.div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-12 md:gap-6">
          {PROJECTS.map((project, index) => (
            <motion.article
              key={project.title}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: index * 0.08, ease: [0.25, 0.1, 0.25, 1] }}
              viewport={viewport}
              className={`group relative overflow-hidden rounded-3xl border border-pf-stroke bg-pf-surface ${project.span} ${project.aspect}`}
            >
              <img
                src={project.image}
                alt={project.title}
                loading="lazy"
                className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <div className="halftone-overlay absolute inset-0" />
              <div className="absolute inset-0 flex items-end justify-center bg-pf-bg/0 p-6 opacity-0 backdrop-blur-0 transition-all duration-500 group-hover:bg-pf-bg/70 group-hover:opacity-100 group-hover:backdrop-blur-lg">
                <span className="gradient-border-hover relative rounded-full bg-white px-5 py-2.5 text-sm text-pf-bg">
                  <span className="relative z-10">
                    View — <span className="font-display italic">{project.title}</span>
                  </span>
                </span>
              </div>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  )
}
