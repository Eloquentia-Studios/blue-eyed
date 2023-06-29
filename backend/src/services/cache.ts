import { createClient } from 'redis'

let client: ReturnType<typeof createClient>

export const initCache = async () => {
  client = createClient({
    url: process.env.REDIS_URL
  })
  client.on('error', (err) => console.log('Redis Client Error', err))
  return client.connect()
}

interface CacheOptions {
  ttl?: number
}

export const setCache = async (key: string, value: any, options: CacheOptions = {}) => client.set(key, JSON.stringify(value), { EX: options.ttl })

export const getCache = async <T>(key: string) => {
  const value = await client.get(key)
  if (!value) return null

  return JSON.parse(value) as T
}
