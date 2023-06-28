export const checkCredentials = async (username: string, password: string) => {
  const USERNAME = process.env.USERNAME
  const PASSWORD = process.env.PASSWORD

  if (!USERNAME || !PASSWORD) throw new Error('Username or password not set')

  if (username === USERNAME && password === PASSWORD) return true
  return false
}
