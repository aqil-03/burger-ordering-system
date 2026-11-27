import { execFileSync, spawn } from 'node:child_process'
import { rm } from 'node:fs/promises'
import { createServer } from 'node:net'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import bcrypt from 'bcryptjs'

const serverDir = fileURLToPath(new URL('../..', import.meta.url))
const clientDir = path.resolve(serverDir, '..', 'client')
const prismaDir = path.join(serverDir, 'prisma')
const prismaBin = path.join(
  serverDir,
  'node_modules',
  'prisma',
  'build',
  'index.js',
)
const viteBin = path.join(clientDir, 'node_modules', 'vite', 'bin', 'vite.js')

export const TEST_VENDOR = Object.freeze({
  name: 'Test Owner',
  email: 'test-owner@burgerhouse.local',
  username: 'test-owner',
  password: 'TestOwner#2026!',
})

export const TEST_MENU_ITEMS = Object.freeze([
  {
    id: 'test-burger-ayam',
    name: 'Burger Ayam',
    description: 'Golden fried chicken with lettuce and house sauce.',
    priceSen: 1000,
    imageUrl: '/menu/burger-ayam.jpg',
    sortOrder: 1,
  },
  {
    id: 'test-burger-crispy',
    name: 'Burger Crispy',
    description: 'Crispy chicken with pickles and creamy sauce.',
    priceSen: 2000,
    imageUrl: '/menu/burger-crispy.jpg',
    sortOrder: 2,
  },
  {
    id: 'test-burger-daging',
    name: 'Burger Daging',
    description: 'Flame-grilled beef with lettuce, tomato and onion.',
    priceSen: 1500,
    imageUrl: '/menu/burger-daging.jpg',
    sortOrder: 3,
  },
  {
    id: 'test-burger-special',
    name: 'Burger Special',
    description: 'Double beef, cheese, pickles and special sauce.',
    priceSen: 2500,
    imageUrl: '/menu/burger-special.jpg',
    sortOrder: 4,
  },
])

function getFreePort() {
  return new Promise((resolve, reject) => {
    const server = createServer()
    server.unref()
    server.on('error', reject)
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address()
      server.close(() => resolve(port))
    })
  })
}

function wait(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds))
}

async function waitForHttp(url, timeoutMs = 30000) {
  const deadline = Date.now() + timeoutMs

  while (Date.now() < deadline) {
    try {
      const response = await fetch(url)
      if (response.ok) return response
    } catch {
      // Server is still starting.
    }

    await wait(250)
  }

  throw new Error(`Timed out waiting for ${url}`)
}

async function stopProcess(child) {
  if (!child || child.exitCode !== null) return

  if (process.platform === 'win32') {
    try {
      execFileSync('taskkill', ['/PID', String(child.pid), '/T', '/F'], {
        stdio: 'ignore',
      })
    } catch {
      // Process may already have exited.
    }
  } else {
    child.kill('SIGTERM')
  }

  await Promise.race([
    new Promise((resolve) => child.once('exit', resolve)),
    wait(5000).then(() => {
      if (child.exitCode === null) child.kill('SIGKILL')
    }),
  ])
}

function collectOutput(child) {
  let output = ''
  child.stdout?.on('data', (chunk) => {
    output += chunk.toString()
  })
  child.stderr?.on('data', (chunk) => {
    output += chunk.toString()
  })
  return () => output
}

export async function createTestEnvironment({ withFrontend = false } = {}) {
  const dbName = `test-stage12-${process.pid}-${Date.now()}.db`
  const dbUrl = `file:./${dbName}`
  const dbPath = path.join(prismaDir, dbName)
  const uploadsDir = path.join(
    tmpdir(),
    `burger-stage12-uploads-${process.pid}-${Date.now()}`,
  )
  const previousDatabaseUrl = process.env.DATABASE_URL
  let apiProcess = null
  let webProcess = null
  let prisma = null
  let apiLogs = () => ''
  let webLogs = () => ''

  try {
    execFileSync(process.execPath, [prismaBin, 'migrate', 'deploy'], {
      cwd: serverDir,
      env: { ...process.env, DATABASE_URL: dbUrl },
      stdio: 'pipe',
    })

    process.env.DATABASE_URL = dbUrl
    const { PrismaClient } = await import('@prisma/client')
    prisma = new PrismaClient()

    const passwordHash = await bcrypt.hash(TEST_VENDOR.password, 12)

    await prisma.setting.create({
      data: {
        id: 'default',
        restaurantName: 'Burger House',
        logoUrl: '/brand-logo.svg',
        duitnowQrUrl: '/payment/duitnow-demo.svg',
        duitnowQrIsDemo: true,
        paymentNote:
          'DuitNow payments are verified manually by the vendor before they are marked Paid.',
        queueResetHour: 4,
        timezone: 'Asia/Kuala_Lumpur',
        maxPreparing: 1,
      },
    })

    await prisma.vendor.create({
      data: {
        name: TEST_VENDOR.name,
        email: TEST_VENDOR.email,
        username: TEST_VENDOR.username,
        passwordHash,
        role: 'OWNER',
      },
    })

    await prisma.menuItem.createMany({
      data: TEST_MENU_ITEMS,
    })

    const apiPort = await getFreePort()
    const webPort = withFrontend ? await getFreePort() : null
    const apiUrl = `http://127.0.0.1:${apiPort}`
    const webUrl = webPort ? `http://127.0.0.1:${webPort}` : null

    apiProcess = spawn(process.execPath, ['src/server.js'], {
      cwd: serverDir,
      env: {
        ...process.env,
        PORT: String(apiPort),
        HOST: '127.0.0.1',
        DATABASE_URL: dbUrl,
        NODE_ENV: 'test',
        PUBLIC_APP_URL: webUrl ?? apiUrl,
        TRUST_PROXY: 'false',
        UPLOADS_DIR: uploadsDir,
      },
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
    })
    apiLogs = collectOutput(apiProcess)

    try {
      await waitForHttp(`${apiUrl}/api/health`)
    } catch (error) {
      throw new Error(
        `Test API failed to start.\n${apiLogs()}\n${error.message}`,
      )
    }

    if (withFrontend) {
      webProcess = spawn(
        process.execPath,
        [viteBin, '--port', String(webPort), '--strictPort'],
        {
          cwd: clientDir,
          env: {
            ...process.env,
            API_PROXY_TARGET: apiUrl,
          },
          stdio: ['ignore', 'pipe', 'pipe'],
          windowsHide: true,
        },
      )
      webLogs = collectOutput(webProcess)

      try {
        await waitForHttp(webUrl)
      } catch (error) {
        throw new Error(
          `Test frontend failed to start.\n${webLogs()}\n${error.message}`,
        )
      }
    }

    return {
      apiUrl,
      apiPort,
      webUrl,
      webPort,
      prisma,
      uploadsDir,
      testVendor: TEST_VENDOR,
      testMenuItems: TEST_MENU_ITEMS,
      getApiLogs: () => apiLogs(),
      getWebLogs: () => webLogs(),
      cleanup: async () => {
        await stopProcess(webProcess)
        await stopProcess(apiProcess)

        if (prisma) {
          await prisma.$disconnect()
          prisma = null
        }

        process.env.DATABASE_URL = previousDatabaseUrl

        await rm(dbPath, { force: true })
        await rm(`${dbPath}-journal`, { force: true })
        await rm(`${dbPath}-shm`, { force: true })
        await rm(`${dbPath}-wal`, { force: true })
        await rm(uploadsDir, { force: true, recursive: true })
      },
    }
  } catch (error) {
    await stopProcess(webProcess)
    await stopProcess(apiProcess)

    if (prisma) {
      await prisma.$disconnect().catch(() => {})
    }

    process.env.DATABASE_URL = previousDatabaseUrl

    await rm(dbPath, { force: true }).catch(() => {})
    await rm(`${dbPath}-journal`, { force: true }).catch(() => {})
    await rm(`${dbPath}-shm`, { force: true }).catch(() => {})
    await rm(`${dbPath}-wal`, { force: true }).catch(() => {})
    await rm(uploadsDir, { force: true, recursive: true }).catch(() => {})
    throw error
  }
}
