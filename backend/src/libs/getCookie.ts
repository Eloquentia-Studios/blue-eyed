import type { Request } from 'express'

const getCookie = (req: Request, name: string) => {
  const cookie = req.headers?.cookie
  if (!cookie) return undefined

  const row = cookie.split('; ').find((row) => row.startsWith(`${name}=`))
  if (!row) return undefined

  return row.split('=')[1]
}

export default getCookie
