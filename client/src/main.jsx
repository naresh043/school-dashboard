import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { SCHOOL_NAME } from './data/branding.js'

document.title = `${SCHOOL_NAME} · School Dashboard`

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
