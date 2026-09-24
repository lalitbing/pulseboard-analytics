import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Analytics } from '@vercel/analytics/react'
import { ConvexProvider } from 'convex/react'
import './index.css'
import App from './App.tsx'
import { convex } from './lib/convex.ts'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ConvexProvider client={convex}>
      <App />
      <Analytics />
    </ConvexProvider>
  </StrictMode>,
)
