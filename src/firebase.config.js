import { initializeApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'
import { getAuth } from 'firebase/auth'

// Public by design; the Firestore security rules are what protect writes.
const firebaseConfig = {
  apiKey: 'AIzaSyDwjWYEbmXTve7SDRUisg78z3dQ8z-Fshg',
  authDomain: 'score-ab982.firebaseapp.com',
  projectId: 'score-ab982',
  storageBucket: 'score-ab982.firebasestorage.app',
  messagingSenderId: '534282692651',
  appId: '1:534282692651:web:9594763cda93df60c1e26e'
}

const app = initializeApp(firebaseConfig)
export const db = getFirestore(app)
export const auth = getAuth(app)
