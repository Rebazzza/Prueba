import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { ProfileProvider } from './auth/ProfileContext.tsx'
import { MusicProvider } from './music/MusicContext.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ProfileProvider>
      <MusicProvider>
        <App />
      </MusicProvider>
    </ProfileProvider>
  </StrictMode>,
)