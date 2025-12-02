import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  const env = loadEnv(mode, (process as any).cwd(), '');
  
  // VITAL for Vercel: process.env.API_KEY (System Env) takes precedence over .env files
  const apiKey = process.env.API_KEY || env.API_KEY;

  return {
    plugins: [react()],
    define: {
      // This allows the client-side code to access `process.env.API_KEY`
      'process.env.API_KEY': JSON.stringify(apiKey)
    }
  }
})