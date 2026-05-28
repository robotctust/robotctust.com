import * as admin from 'firebase-admin'
import fs from 'fs'
import path from 'path'

let app: admin.app.App

const saPath = path.join(process.cwd(), 'robot-group-firebase-sa.json')
const hasLocalSa = fs.existsSync(saPath)
const hasEnvCredentials = !!(process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY)

// When explicit credentials exist, always delete and reinitialize the existing app.
// This ensures HMR cycles don't reuse a stale ADC app that was created by a previous
// code version lacking explicit credential support (ADC apps have a credential object
// but no valid project ID, so the isUncredentialed check doesn't catch them).
const initApp = async () => {
  if (admin.apps.length > 0 && (hasEnvCredentials || hasLocalSa)) {
    try {
      await admin.apps[0]!.delete()
    } catch (err) {
      console.error('Firebase Admin: Error deleting existing app:', err)
    }
  }

  if (!admin.apps.length) {
    if (hasEnvCredentials) {
      app = admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY!.replace(/\\n/g, '\n'),
        }),
      })
    } else if (hasLocalSa) {
      const serviceAccount = JSON.parse(fs.readFileSync(saPath, 'utf8'))
      app = admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      })
    } else {
      console.warn('Firebase Admin: No credentials found, falling back to ADC.')
      app = admin.initializeApp()
    }
  } else {
    app = admin.apps[0]!
  }
}

await initApp()

export const adminDb = admin.firestore()
export default admin



