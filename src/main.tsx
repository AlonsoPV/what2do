import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import { clearChunkReloadFlag } from './lib/importWithReload'
import './styles/globals.css'

clearChunkReloadFlag()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
)
