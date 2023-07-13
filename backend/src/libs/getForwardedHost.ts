import type { Request } from 'express'

const getForwardedUrl = (req: Request): string => `${getHeaderValue(req, 'x-forwarded-proto')}://${getHeaderValue(req, 'x-forwarded-host')}`

const getHeaderValue = (req: Request, name: string): string => {
  const value = req.headers[name]
  if (!value) throw new Error(`No ${name}`)
  if (Array.isArray(value)) throw new Error(`${name} is an array`)
  return value
}

export default getForwardedUrl
