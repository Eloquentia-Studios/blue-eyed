import { createClient } from 'redis'
import { ENV } from '../env'
import logger from './logging'

type CacheOptions = { ttl?: number }

export default class Cache {
  private static redis: ReturnType<typeof createClient>

  public static async init() {
    logger.debug('Initializing cache')
    this.redis = createClient({
      url: ENV.REDIS_URL
    })
    this.redis.on('error', (err) => logger.error(`Redis error: ${err}`))
    return this.redis.connect()
  }

  public static async set(key: string, value: any, options: CacheOptions = {}) {
    const stringifiedValue = JSON.stringify(value)
    logger.debug(`Setting cache for key ${key}, with options: ${JSON.stringify(options)} and value: ${stringifiedValue}`)
    const res = await this.redis.set(key, stringifiedValue, { EX: options.ttl })

    if (!res) {
      logger.error(`Failed to set cache for key ${key}, got response: ${res}`)
      throw new Error('Failed to set cache')
    }
  }

  public static async get<T>(key: string) {
    logger.debug(`Getting cache for key ${key}`)
    const value = await this.redis.get(key)

    if (!value) {
      logger.debug(`Cache for key ${key} is invalid, with value: ${value}`)
      return null
    }

    logger.debug(`Got cache value for key ${key}: ${value}`)
    const data = JSON.parse(value) as T
    return data
  }

  public static async delete(key: string) {
    logger.debug(`Deleting cache for key ${key}`)
    const res = await this.redis.del(key)

    if (res === 0) {
      logger.debug(`Tried to delete cache for key ${key}, but it did not exist`)
      return
    }

    if (!res) {
      logger.error(`Failed to delete cache for key ${key}, got response: ${res}`)
      throw new Error('Failed to delete cache')
    }
  }
}
