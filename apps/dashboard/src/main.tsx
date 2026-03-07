import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Analytics } from '@vercel/analytics/react'
import './index.css'
import App from './App.tsx'
import { RealTimeProvider } from './contexts/RealTimeContext.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RealTimeProvider>
      <App />
      <Analytics />
    </RealTimeProvider>
  </StrictMode>,
)
