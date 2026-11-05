<script setup>
import { ref, computed, onUnmounted } from 'vue'
import { doc, onSnapshot } from 'firebase/firestore'
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth'
import { db, auth } from './firebase.config.js'
import Scoreboard from './components/Scoreboard.vue'
import Scorer from './components/Scorer.vue'

const SCORER_UID = 'X9GeuM5CnhOiOdaaIudizYWZocg2'

const match = ref(null), loaded = ref(false), user = ref(null), authLoaded = ref(false)
const isScorer = computed(() => user.value?.uid === SCORER_UID)
const scorerMode = ref(location.hash === '#/score')
const email = ref(''), password = ref(''), err = ref('')

const onHash = () => { scorerMode.value = location.hash === '#/score' }
window.addEventListener('hashchange', onHash)

const stopDb = onSnapshot(doc(db, 'matches', 'live'),
  s => { match.value = s.exists() ? s.data() : null; loaded.value = true },
  e => { err.value = e.message; loaded.value = true })
const stopAuth = onAuthStateChanged(auth, u => {
  user.value = u
  authLoaded.value = true
})
onUnmounted(() => { stopDb(); stopAuth(); window.removeEventListener('hashchange', onHash) })

const login = async () => {
  err.value = ''
  try {
    await signInWithEmailAndPassword(auth, email.value, password.value)
    password.value = ''
  } catch (e) {
    err.value = 'Login failed. Check your email and password.'
  }
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
      <p v-if="!authLoaded" aria-busy="true">Checking authentication…</p>
      <form v-else-if="!user" @submit.prevent="login">
        <input v-model="email" type="email" placeholder="Scorer email" autocomplete="username" required>
        <input v-model="password" type="password" placeholder="Password" autocomplete="current-password" required>
        <button type="submit">Log in</button>
      </form>
      <template v-else-if="!isScorer">
        <p><mark>This account is not authorised to edit the scorecard.</mark></p>
        <button class="outline secondary" @click="signOut(auth)">Log out</button>
      </template>
      <template v-else>
        <Scorer :match="match" />
        <button class="outline secondary" @click="signOut(auth)">Log out</button>
      </template>
    </template>
  </main>
</template>
