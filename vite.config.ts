import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  const env = loadEnv(mode, (process as any).cwd(), '');
  
  return {
    plugins: [react()],
    define: {
      // This is necessary because the prompt requires using `process.env.API_KEY` specifically.
      // Vite normally uses `import.meta.env`. This bridge allows the code to remain compliant.
      'process.env.API_KEY': JSON.stringify(env.API_KEY)
    }
  }
})