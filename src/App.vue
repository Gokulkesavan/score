<script setup>
import { ref, onUnmounted } from 'vue'
import { doc, onSnapshot } from 'firebase/firestore'
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth'
import { db, auth } from './firebase.config.js'
import Scoreboard from './components/Scoreboard.vue'
import Scorer from './components/Scorer.vue'

const match = ref(null), loaded = ref(false), user = ref(null)
const scorerMode = ref(location.hash === '#/score')
const email = ref(''), password = ref(''), err = ref('')

const onHash = () => { scorerMode.value = location.hash === '#/score' }
window.addEventListener('hashchange', onHash)

const stopDb = onSnapshot(doc(db, 'matches', 'live'),
  s => { match.value = s.exists() ? s.data() : null; loaded.value = true },
  e => { err.value = e.message })
const stopAuth = onAuthStateChanged(auth, u => { user.value = u })
onUnmounted(() => { stopDb(); stopAuth(); window.removeEventListener('hashchange', onHash) })

const login = async () => {
  err.value = ''
  try { await signInWithEmailAndPassword(auth, email.value, password.value) }
  catch (e) { err.value = 'Login failed' }
}
</script>

<template>
  <main class="container">
    <hgroup><h1>Cricket Scoring</h1><h3>Live scoreboard</h3></hgroup>
    <p v-if="err"><mark>{{ err }}</mark></p>

    <template v-if="!scorerMode">
      <p v-if="!loaded" aria-busy="true">Loading…</p>
      <Scoreboard v-else-if="match" :match="match" />
      <p v-else>No match is being scored right now.</p>
    </template>

    <template v-else>
      <form v-if="!user" @submit.prevent="login">
        <input v-model="email" type="email" placeholder="Scorer email" required>
        <input v-model="password" type="password" placeholder="Password" required>
        <button>Log in</button>
      </form>
      <template v-else>
        <Scorer :match="match" />
        <button class="outline secondary" @click="signOut(auth)">Log out</button>
      </template>
    </template>
  </main>
</template>
