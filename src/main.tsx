import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/index.css'
import App from './App.tsx'

// Dark Mode vor dem ersten Rendern anwenden, damit nichts aufblitzt
if (localStorage.getItem('papedit-dark') === '1') {
  document.documentElement.classList.add('dark')
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
