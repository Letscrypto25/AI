import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const rawBasePath = env.VITE_APP_BASE_PATH || '/Helpbot/'
  const normalizedBasePath = rawBasePath.startsWith('/') ? rawBasePath : `/${rawBasePath}`
  const basePath = normalizedBasePath.endsWith('/') ? normalizedBasePath : `${normalizedBasePath}/`
  const port = Number(env.PORT) || 8080

  return {
    base: basePath,
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      host: '0.0.0.0',
      port,
    },
    preview: {
      host: '0.0.0.0',
      port,
    },
  }
})
