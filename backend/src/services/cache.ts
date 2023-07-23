import { createClient } from 'redis'
import { ENV } from './env'

let client: ReturnType<typeof createClient>

export const initCache = async () => {
  client = createClient({
    url: ENV.REDIS_URL
  })
  client.on('error', (err) => console.log('Redis Client Error', err))
  return client.connect()
}

type CacheOptions = { ttl?: number }
export const setCache = async (key: string, value: any, options: CacheOptions = {}) => {
  const res = client.set(key, JSON.stringify(value), { EX: options.ttl })
  if (!res) throw new Error('Failed to set cache')
}

export const getCache = async <T>(key: string) => {
  const value = await client.get(key)
  if (!value) return null

  return JSON.parse(value) as T
}

export const deleteCache = async (key: string) => {
  const res = await client.del(key)
  if (!res) throw new Error('Failed to delete cache')
}
