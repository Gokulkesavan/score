<script setup>
import { ref, computed } from 'vue'
import { doc, setDoc, deleteDoc } from 'firebase/firestore'
import { db } from '../firebase.config.js'
import { newMatch, addBall, undo, endInnings, batIdx, summarize } from '../cricket.js'
import Scoreboard from './Scoreboard.vue'

const props = defineProps({ match: Object })
const m = computed(() => props.match)
const matchDoc = doc(db, 'matches', 'live')
const save = n => setDoc(matchDoc, n).catch(e => alert('Save failed: ' + e.message))

// ---- setup form (one player per line, any team size)
const names = ref(['Team A', 'Team B']), lists = ref(['', '']), first = ref(0)
const lines = t => t.split('\n').map(s => s.trim()).filter(Boolean)
const start = () => {
  const l = lists.value.map(lines)
  if (l[0].length < 2 || l[1].length < 2) return alert('Enter at least 2 players per team')
  save(newMatch([...names.value], l, Number(first.value)))
}

// ---- live scoring
const S = computed(() => (m.value ? summarize(m.value) : null))
const batTeam = computed(() => batIdx(m.value, m.value.inn))
const outIds = computed(() => Object.entries(S.value.inns[m.value.inn].bat).filter(([, b]) => b.out).map(([id]) => Number(id)))
const availBat = computed(() => m.value.players.filter(p => p.team === batTeam.value &&
  !outIds.value.includes(p.id) && p.id !== m.value.striker && p.id !== m.value.nonStriker))
const bowlers = computed(() => m.value.players.filter(p => p.team !== batTeam.value))
const slot = computed(() => (m.value.striker == null ? 'striker' : m.value.nonStriker == null ? 'nonStriker' : null))
const curBalls = computed(() => m.value.balls.some(b => b.inn === m.value.inn))

const extra = ref(null)
const toggle = e => { extra.value = extra.value === e ? null : e }
const score = (runs, wicket = false) => { save(addBall(m.value, { runs, extra: extra.value, wicket })); extra.value = null }
const pickBatter = id => save({ ...m.value, [slot.value]: id })
const pickBowler = id => save({ ...m.value, bowler: id })
const end = () => confirm('End this innings?') && save(endInnings(m.value))
const reset = () => confirm('Discard this match and start a new one?') && deleteDoc(matchDoc)
</script>

<template>
  <!-- no match yet: setup -->
  <article v-if="!m">
    <h2>New match</h2>
    <div v-for="t in [0, 1]" :key="t">
      <input v-model="names[t]" :placeholder="'Team ' + (t + 1) + ' name'">
      <textarea v-model="lists[t]" rows="6" placeholder="One player per line"></textarea>
    </div>
    <label>Batting first
      <select v-model="first"><option :value="0">{{ names[0] }}</option><option :value="1">{{ names[1] }}</option></select>
    </label>
    <button @click="start">Start match</button>
  </article>

  <template v-else>
    <Scoreboard :match="m" />
    <template v-if="!m.finished">
      <article v-if="slot">
        <h3>Select {{ slot === 'striker' ? 'striker' : 'non-striker' }}</h3>
        <p v-if="!availBat.length">No batters left.</p>
        <div class="pad"><button v-for="p in availBat" :key="p.id" @click="pickBatter(p.id)">{{ p.name }}</button></div>
      </article>
      <article v-else-if="m.bowler == null">
        <h3>Select bowler</h3>
        <div class="pad"><button v-for="p in bowlers" :key="p.id" @click="pickBowler(p.id)">{{ p.name }}</button></div>
      </article>
      <article v-else>
        <div class="pad">
          <button v-for="e in ['wd', 'nb', 'b', 'lb']" :key="e" :class="extra === e ? '' : 'outline'" @click="toggle(e)">{{ e }}</button>
        </div>
        <div class="pad">
          <button v-for="r in 7" :key="r" @click="score(r - 1)">{{ r - 1 }}</button>
          <button class="contrast" @click="score(0, true)">W</button>
        </div>
      </article>
      <div class="pad">
        <button class="secondary" :disabled="!curBalls" @click="save(undo(m))">Undo</button>
        <button class="secondary outline" @click="end">End innings</button>
      </div>
    </template>
    <button class="outline contrast" @click="reset">New match</button>
  </template>
</template>

<style scoped>
.pad { display: grid; grid-template-columns: repeat(auto-fit, minmax(5rem, 1fr)); gap: .5rem; margin-bottom: .5rem; }
.pad button { margin: 0; padding: 1rem .25rem; }
</style>
