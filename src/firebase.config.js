import { initializeApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'
import { getAuth } from 'firebase/auth'

// Public by design; Firestore security rules protect writes.
const firebaseConfig = {
  apiKey: 'AIzaSyA7a02qnPk2Ej_M7SEmxZePw4niDMusAgw',
  authDomain: 'score-76f08.firebaseapp.com',
  projectId: 'score-76f08',
  storageBucket: 'score-76f08.firebasestorage.app',
  messagingSenderId: '1068583486792',
  appId: '1:1068583486792:web:b2e82164e49a347a03df7d',
  measurementId: 'G-ZQ9KZWR8BT'
}

const app = initializeApp(firebaseConfig)
export const db = getFirestore(app)
export const auth = getAuth(app)
