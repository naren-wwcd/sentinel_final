import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { IconContext } from '@phosphor-icons/react'
import '@fontsource-variable/plus-jakarta-sans'
import '@fontsource-variable/jetbrains-mono'
import App from './App.jsx'
import { ThemeProvider } from './components/theme.jsx'
import { Providers } from './components/ui.jsx'
import './styles.css'

createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <ThemeProvider>
      <IconContext.Provider value={{ size: 16, weight: 'regular' }}>
        <Providers>
          <App />
        </Providers>
      </IconContext.Provider>
    </ThemeProvider>
  </BrowserRouter>
)
