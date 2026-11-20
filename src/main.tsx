import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import './index.css'
import { Provider } from './store'
import App from './App'

createRoot(document.getElementById('root')!).render(<StrictMode><Provider><HashRouter><App /></HashRouter></Provider></StrictMode>)
