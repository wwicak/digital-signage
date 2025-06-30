// import * as dotenv from 'dotenv'; // Remove this
const dotenv = require('dotenv') // Use require
import boxen from 'boxen'

dotenv.config() // Load .env file variables into process.env

/*
 * If dotenv was required, its return value from .config() might be different or not automatically typed.
 * We'll assume .parsed is available, but this could be a source of runtime errors if not handled.
 */
const configResult = dotenv.config()
const parsedDotenv = configResult.parsed || {}


const defaultPort = 3001
export const PORT: number = parseInt(process.env.PORT || parsedDotenv.PORT || String(defaultPort), 10)
export const ENVIRON: string = process.env.ENVIRON || parsedDotenv.ENVIRON || 'DEV'

let mongoUri: string | undefined = process.env.MONGODB_URI || parsedDotenv.MONGODB_URI

if (process.env.NODE_ENV === 'test') {
  mongoUri = 'mongodb+srv://dimastw:dya0gVD7m9xJNJpo@cluster0.jez3b.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0'
} else if (!mongoUri) {
  if (ENVIRON === 'PROD') {
    console.error('FATAL ERROR: MONGODB_URI is not defined in a production environment.')
    process.exit(1)
  } else {
    console.warn('Warning: MONGODB_URI is not defined. Using default development URI: mongodb://localhost/display')
    mongoUri = 'mongodb://localhost/display'
  }
}
export const MONGODB_URI: string = mongoUri

export let SESSION_SECRET: string | undefined = process.env.SESSION_SECRET || parsedDotenv.SESSION_SECRET
if (!SESSION_SECRET) {
  if (ENVIRON === 'PROD') {
    console.error('FATAL ERROR: SESSION_SECRET is not defined in a production environment.')
    process.exit(1)
  } else {
    console.warn('Warning: SESSION_SECRET is not defined. Using a default development secret "dev-secret". THIS IS NOT SECURE FOR PRODUCTION!')
    SESSION_SECRET = 'dev-secret' // Default for non-production
  }
}

let hostUrl: string | undefined = process.env.SERVER_HOST || parsedDotenv.SERVER_HOST
if (!hostUrl) {
  if (ENVIRON === 'PROD') {
    console.error('FATAL ERROR: HOST_URL is not defined in a production environment. This is needed for absolute URLs.')
    process.exit(1)
  } else {
    const resolvedPort = PORT || defaultPort
    console.warn(`Warning: HOST_URL is not defined. Defaulting to http://localhost:${resolvedPort}/ for development.`)
    hostUrl = `http://localhost:${resolvedPort}/`
  }
}
export const HOST_URL: string = hostUrl

// const dotenvResult = dotenv.config(); // Already called above
if (configResult.error && !process.env.ENVIRON && ENVIRON === 'DEV') {
  console.error(
    `Welcome to digital-signage!\n
You have not configured your installation yet, please run the setup utility by executing:\n` +
      boxen('$   npm run setup', { padding: 1, margin: 1, borderStyle: 'double' as const }) // Use const assertion for borderStyle
  )
}
