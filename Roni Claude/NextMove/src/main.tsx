import './lib/polyfills' // first: older iPhones
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource-variable/fraunces/full.css'
import '@fontsource-variable/inter'
import './lib/install' // catch the browser's install prompt as early as possible
import './index.css'
import './styles/layout.css'
import App from './App.tsx'
import { requestPersistentStorage } from './lib/storage'

requestPersistentStorage() // ask the browser not to clear saved progress on its own

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
