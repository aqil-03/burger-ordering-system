import 'dotenv/config'
import { PrismaClient } from '@prisma/client'

// One shared Prisma client is used by all routes. Prisma manages the
// connection to the SQLite database file configured by DATABASE_URL.
export const prisma = new PrismaClient({
  log:
    process.env.NODE_ENV === 'production'
      ? ['error']
      : ['warn', 'error'],
})
