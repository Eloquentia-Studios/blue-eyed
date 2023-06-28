import { TRPCError } from '@trpc/server'
import { randomBytes } from 'crypto'
import { setCache } from './cache.js'

export const checkCredentials = (username: string, password: string) => {
  const USERNAME = process.env.ADMIN_USERNAME
  const PASSWORD = process.env.ADMIN_PASSWORD

  if (!USERNAME || !PASSWORD) throw new Error('Username or password not set')

  if (username === USERNAME && password === PASSWORD) return true
  return false
}

export const createAuthorizedToken = async (username: string) => {
  const token = generateToken()
  const time = new Date().getTime()

  const res = await setCache(token, { username, time })
  if (!res) throw new TRPCError({ message: 'Failed to create token.', code: 'INTERNAL_SERVER_ERROR' })
  return token
}

const generateToken = () => randomBytes(64).toString('hex')
