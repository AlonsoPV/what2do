import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { LoadingScreen } from './components/LoadingScreen'
import { HeroSection } from './components/HeroSection'
import { SelectedWorks } from './components/SelectedWorks'
import { JournalSection } from './components/JournalSection'
import { ExplorationsSection } from './components/ExplorationsSection'
import { StatsSection } from './components/StatsSection'
import { ContactFooter } from './components/ContactFooter'
import './webtest.css'

const PAGE_TITLE = 'Michael Smith — Portfolio'

export function WebtestPage() {
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const previousTitle = document.title
    document.title = PAGE_TITLE
    return () => {
      document.title = previousTitle
    }
  }, [])

  return (
    <div className="portfolio-page min-h-screen">
      <AnimatePresence mode="wait">
        {isLoading ? (
          <LoadingScreen key="loading" onComplete={() => setIsLoading(false)} />
        ) : (
          <motion.main
            key="content"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
          >
            <HeroSection />
            <SelectedWorks />
            <JournalSection />
            <ExplorationsSection />
            <StatsSection />
            <ContactFooter />
          </motion.main>
        )}
      </AnimatePresence>
    </div>
  )
}
