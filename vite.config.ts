import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { createVerify } from 'node:crypto'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const token = env.VITE_LICENSE_TOKEN
  const signature = env.VITE_LICENSE_SIGNATURE
  const publicKeyPem = env.VITE_PUBLIC_KEY_PEM
  if (!token || !signature || !publicKeyPem) {
    throw new Error('License env missing')
  }
  const v = createVerify('RSA-SHA256')
  v.update(token)
  v.end()
  const pub = publicKeyPem.replace(/\\n/g, '\n')
  const ok = v.verify(pub, signature, 'base64')
  if (!ok) {
    throw new Error('License verification failed')
  }
  return {
    plugins: [react()],
    server: { port: 4988 },
  }
})
