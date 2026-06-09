import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import { clearChunkReloadFlag, registerChunkLoadRecovery } from './lib/importWithReload'
import './styles/globals.css'

clearChunkReloadFlag()
registerChunkLoadRecovery()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
)
