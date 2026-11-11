import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource-variable/manrope/index.css'
import './styles/base.css'
import './styles/components.css'
import './styles/widgets.css'
import './styles/print.css'
import App from './App'
import { initCloud } from './lib/store'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

initCloud()
