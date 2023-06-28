import { createClient } from 'redis'

let client: ReturnType<typeof createClient>

export const initCache = async () => {
  client = createClient()
  client.on('error', (err) => console.log('Redis Client Error', err))
  return client.connect()
}

export const setCache = async (key: string, value: any) => client.set(key, JSON.stringify(value))

export const getCache = async <T>(key: string) => {
  const value = await client.get(key)
  if (!value) return null

  return JSON.parse(value) as T
}
