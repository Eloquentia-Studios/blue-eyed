import { TRPCError } from '@trpc/server'
import { randomBytes } from 'crypto'
import { getCache, setCache } from './cache.js'

export const checkCredentials = (username: string, password: string) => {
  const USERNAME = process.env.ADMIN_USERNAME
  const PASSWORD = process.env.ADMIN_PASSWORD

  if (!USERNAME || !PASSWORD) throw new Error('Username or password not set')

  if (username === USERNAME && password === PASSWORD) return true
  return false
}

export const createAuthorizedToken = async (username: string) => {
  const token = generateToken()

  const ttl = 60 * 60 * 24 * 7 // 7 days
  const res = await setCache(token, username, { ttl })
  if (!res) throw new TRPCError({ message: 'Failed to create token.', code: 'INTERNAL_SERVER_ERROR' })
  return token
}

export const validateAuthorizedToken = async (token: string) => {
  const username = await getCache<string>(token)
  if (!username) throw new TRPCError({ message: 'Invalid token.', code: 'UNAUTHORIZED' })
  return username
}

export const createRedirectToken = async (token: string) => {
  const redirectToken = generateToken(32)

  const ttl = 10 // 10 seconds
  const res = await setCache(redirectToken, token, { ttl })
  if (!res) throw new TRPCError({ message: 'Failed to create redirect token.', code: 'INTERNAL_SERVER_ERROR' })
  return redirectToken
}

export const validateRedirectToken = async (redirectToken: string) => {
  const token = await getCache<string>(redirectToken)
  if (!token) throw new TRPCError({ message: 'Invalid redirect token.', code: 'UNAUTHORIZED' })
  return token
}

const generateToken = (size: number = 64) => randomBytes(size).toString('hex')
