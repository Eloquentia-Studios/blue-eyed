const getServiceHostname = () => {
  const HOSTNAME = process.env.SERVICE_HOSTNAME
  if (!HOSTNAME) throw new Error('SERVICE_HOSTNAME not set')
  return HOSTNAME
}

export default getServiceHostname
