import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import Explorer from './Explorer.jsx'
import './supply-chain.css'

createRoot(document.getElementById('root')).render(<StrictMode><Explorer /></StrictMode>)
