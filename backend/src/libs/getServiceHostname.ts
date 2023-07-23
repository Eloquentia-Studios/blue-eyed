import { ENV } from '../services/env'

const getServiceHostname = () => {
  const HOSTNAME = ENV.SERVICE_HOSTNAME
  if (!HOSTNAME) throw new Error('SERVICE_HOSTNAME not set')
  return HOSTNAME
}

export default getServiceHostname
