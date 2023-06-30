import { randomBytes } from 'crypto'

const generateRandomString = (size: number = 64) => randomBytes(size).toString('hex')

export default generateRandomString
