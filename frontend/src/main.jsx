import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import App from './App'
import './index.css'

import { GoogleOAuthProvider } from '@react-oauth/google'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
})

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
          <ThemeProvider>
            <AuthProvider>
              <App />
              <Toaster
                position="top-right"
                toastOptions={{
                  style: {
                    background: 'var(--surface)',
                    color: 'var(--text-1)',
                    border: '1px solid var(--border-md)',
                    borderRadius: '12px',
                    fontSize: '14px',
                    boxShadow: 'var(--shadow-md)',
                  },
                  success: { iconTheme: { primary: 'var(--success)', secondary: 'var(--surface)' } },
                  error: { iconTheme: { primary: 'var(--error)', secondary: 'var(--surface)' } },
                }}
              />
            </AuthProvider>
          </ThemeProvider>
        </GoogleOAuthProvider>
      </QueryClientProvider>
    </BrowserRouter>
  </StrictMode>,
)
