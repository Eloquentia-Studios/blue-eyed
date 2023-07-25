import { createClient } from 'redis'
import { ENV } from '../env'
import logger from './logging'

let client: ReturnType<typeof createClient>

export const initCache = async () => {
  logger.debug('Initializing cache')
  client = createClient({
    url: ENV.REDIS_URL
  })
  client.on('error', (err) => console.log('Redis Client Error', err))
  return client.connect()
}

type CacheOptions = { ttl?: number }
export const setCache = async (key: string, value: any, options: CacheOptions = {}) => {
  const stringifiedValue = JSON.stringify(value)
  logger.debug(`Setting cache for key ${key}, with options: ${JSON.stringify(options)} and value: ${stringifiedValue}`)
  const res = await client.set(key, stringifiedValue, { EX: options.ttl })

  if (!res) {
    logger.error(`Failed to set cache for key ${key}, got response: ${res}`)
    throw new Error('Failed to set cache')
  }
}

export const getCache = async <T>(key: string) => {
  logger.debug(`Getting cache for key ${key}`)
  const value = await client.get(key)

  if (!value) {
    logger.debug(`Cache for key ${key} is invalid, with value: ${value}`)
    return null
  }

  logger.debug(`Got cache value for key ${key}: ${value}`)
  const data = JSON.parse(value) as T
  return data
}

export const deleteCache = async (key: string) => {
  logger.debug(`Deleting cache for key ${key}`)
  const res = await client.del(key)

  if (!res) {
    logger.error(`Failed to delete cache for key ${key}, got response: ${res}`)
    throw new Error('Failed to delete cache')
  }
}
