import type { Request } from 'express'

const getCookie = (req: Request, name: string) => {
  const cookie = req.headers?.cookie
  if (!cookie) return undefined

  const row = getRow(cookie, name)
  if (!row) return undefined

  return getValue(row)
}

const getRow = (cookie: string, name: string) => cookie.split('; ').find((row) => row.startsWith(`${name}=`))
const getValue = (row: string) => row.split('=')[1]

export default getCookie
