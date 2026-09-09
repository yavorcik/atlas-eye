import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { startOwnerActivity } from '../ownerActivity.js'
import Explorer from './Explorer.jsx'
import './supply-chain.css'

startOwnerActivity()

createRoot(document.getElementById('root')).render(<StrictMode><Explorer /></StrictMode>)
