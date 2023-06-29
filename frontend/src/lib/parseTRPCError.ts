// I don't like this, but couldn't be arsed to write it in a better way
const parseTRPCError = (msg: string) => {
  let error: string | undefined = undefined
  let fields: { [key: string]: string } = {}
  try {
    const data = JSON.parse(msg)
    data.reverse().forEach((d: { path: string[]; message: string }) => (fields[d.path.join('.')] = d.message))
  } catch (err) {
    error = msg
  } finally {
    return { error, fields }
  }
}

export default parseTRPCError
