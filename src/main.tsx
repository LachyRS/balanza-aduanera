import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// Loads `maypop` before the first render, so `maypop.launchPath` can pick
// the screen a deep link opens on.
import '@basilica-digital/maypop-sdk'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
