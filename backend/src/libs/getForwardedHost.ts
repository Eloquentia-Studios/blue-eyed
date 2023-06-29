import type { Request } from 'express'

const getForwardedHost = (req: Request): string => {
  const forwardedProto = req.headers['x-forwarded-proto']
  if (!forwardedProto) throw new Error('No forwarded proto')
  if (Array.isArray(forwardedProto)) throw new Error('Forwarded proto is array')

  const forwardedHost = req.headers['x-forwarded-host']
  if (!forwardedHost) throw new Error('No forwarded host')
  if (Array.isArray(forwardedHost)) throw new Error('Forwarded host is array')

  return `${forwardedProto}://${forwardedHost}`
}

export default getForwardedHost
