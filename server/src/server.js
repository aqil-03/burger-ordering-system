import http from 'node:http'
import { createApp } from './app.js'
import { env } from './config/env.js'
import { prisma } from './lib/prisma.js'
import { initializeSocketServer } from './realtime/socket.js'

const app = createApp()

const server = http.createServer(app)
initializeSocketServer(server)

server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(
      `Port ${env.port} is already in use. Stop the other process or choose another PORT in server/.env.`,
    )
  } else {
    console.error('Server error:', error)
  }

  process.exit(1)
})

server.listen(env.port, env.host, () => {
  console.log('')
  console.log(`API server: http://localhost:${env.port}`)
  console.log(`Health check: http://localhost:${env.port}/api/health`)
  console.log('Socket.IO live updates are enabled.')
  console.log(`Listening on ${env.host}:${env.port}`)
  console.log('')
})

let isShuttingDown = false

async function shutdown(signal) {
  if (isShuttingDown) return
  isShuttingDown = true

  console.log(`Received ${signal}. Closing server...`)

  server.close(async () => {
    await prisma.$disconnect()
    process.exit(0)
  })

  // Do not hang forever if an open connection blocks shutdown.
  setTimeout(() => process.exit(1), 10_000).unref()
}

process.on('SIGINT', () => shutdown('SIGINT'))
process.on('SIGTERM', () => shutdown('SIGTERM'))
