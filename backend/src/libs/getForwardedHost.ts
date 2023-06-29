import type { Request } from 'express'

const getForwardedHost = (req: Request): string => {
  const forwardedHost = req.headers['x-forwarded-host']
  if (!forwardedHost) throw new Error('No forwarded host')
  if (Array.isArray(forwardedHost)) throw new Error('Forwarded host is array')
  return forwardedHost
}

export default getForwardedHost
