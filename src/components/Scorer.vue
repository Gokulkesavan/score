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
const extras = [{ id: null, label: 'Normal' }, { id: 'wd', label: 'Wide' }, { id: 'nb', label: 'No-ball' }, { id: 'b', label: 'Byes' }, { id: 'lb', label: 'Leg byes' }]
const score = (runs, wicket = false) => { save(addBall(m.value, { runs, extra: extra.value, wicket })); extra.value = null }
const pickBatter = id => save({ ...m.value, [slot.value]: id })
const pickBowler = id => save({ ...m.value, bowler: id })
const end = () => confirm('End this innings?') && save(endInnings(m.value))
const reset = () => confirm('Discard this match and start a new one?') && deleteDoc(matchDoc)
</script>

<template>
  <!-- no match yet: setup -->
  <section v-if="!m" class="setup-panel">
    <div class="section-heading">
      <p class="eyebrow">MATCH SETUP</p>
      <h2>Set up your match</h2>
      <p class="muted">Add the teams and players to get the scorer ready.</p>
    </div>
    <div class="team-setup">
      <article v-for="t in [0, 1]" :key="t" class="team-card">
        <label :for="'team-name-' + t">Team {{ t + 1 }} name</label>
        <input :id="'team-name-' + t" v-model="names[t]" :placeholder="'Team ' + (t + 1)" autocomplete="off">
        <label :for="'team-players-' + t">Players <span class="muted">· one name per line</span></label>
        <textarea :id="'team-players-' + t" v-model="lists[t]" rows="5" :placeholder="'Player 1\nPlayer 2\nPlayer 3'"></textarea>
      </article>
    </div>
    <label for="batting-first">Who bats first?</label>
    <select id="batting-first" v-model="first">
      <option :value="0">{{ names[0] || 'Team 1' }}</option>
      <option :value="1">{{ names[1] || 'Team 2' }}</option>
    </select>
    <button class="primary-action" @click="start">Start match <span aria-hidden="true">→</span></button>
  </section>

  <template v-else>
    <Scoreboard :match="m" />

    <section v-if="!m.finished" class="scoring-panel" aria-label="Ball scoring controls">
      <div v-if="slot" class="selection-panel">
        <p class="eyebrow">NEXT BATTER</p>
        <h3>Select {{ slot === 'striker' ? 'striker' : 'non-striker' }}</h3>
        <p class="muted">Choose the batter to continue scoring.</p>
        <div class="selection-grid">
          <button v-for="p in availBat" :key="p.id" class="player-button" @click="pickBatter(p.id)">{{ p.name }}</button>
        </div>
        <p v-if="!availBat.length" class="muted">No batters left to select.</p>
      </div>

      <div v-else-if="m.bowler == null" class="selection-panel">
        <p class="eyebrow">NEXT OVER</p>
        <h3>Select bowler</h3>
        <div class="selection-grid">
          <button v-for="p in bowlers" :key="p.id" class="player-button" @click="pickBowler(p.id)">{{ p.name }}</button>
        </div>
      </div>

      <template v-else>
        <div class="scoring-heading">
          <div>
            <p class="eyebrow">RECORD THIS BALL</p>
            <h3>Runs scored</h3>
          </div>
          <span class="extra-status" :class="{ active: extra }">{{ extras.find(e => e.id === extra)?.label || 'Normal ball' }}</span>
        </div>

        <div class="run-grid" aria-label="Runs">
          <button v-for="r in 7" :key="r" class="run-button" @click="score(r - 1)" :aria-label="(r - 1) + ' runs'">{{ r - 1 }}</button>
          <button class="wicket-button" @click="score(0, true)" aria-label="Wicket">WICKET</button>
        </div>

        <div class="extras-section">
          <p class="eyebrow">EXTRAS</p>
          <div class="extras-grid" role="group" aria-label="Ball type">
            <button v-for="e in extras" :key="String(e.id)" class="extra-button"
              :class="{ selected: extra === e.id }" :aria-pressed="extra === e.id" @click="extra = e.id">
              {{ e.label }}
            </button>
          </div>
        </div>
        <p class="control-hint">Choose an extra first, then tap the runs scored. Select Normal for a regular delivery.</p>
      </template>
    </section>

    <div v-if="!m.finished" class="match-actions">
      <button class="undo-button" :disabled="!curBalls" @click="save(undo(m))">↶ Undo last ball</button>
      <button class="end-button" @click="end">End innings</button>
    </div>
    <button class="reset-button" @click="reset">Start a new match</button>
  </template>
</template>

<style scoped>
.setup-panel, .scoring-panel { margin: 1rem 0; }
.section-heading { margin-bottom: 1rem; }
.section-heading h2, .scoring-heading h3, .selection-panel h3 { margin: 0 0 .35rem; }
.eyebrow { margin: 0 0 .35rem; color: var(--pico-muted-color); font-size: .72rem; font-weight: 750; letter-spacing: .1em; }
.muted, .control-hint { color: var(--pico-muted-color); font-size: .9rem; }
.team-setup { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: .75rem; }
.team-card { margin: 0; padding: 1rem; }
.team-card input, .team-card textarea { margin-bottom: .85rem; }
.primary-action { width: 100%; min-height: 3.5rem; margin-top: .75rem; }
.scoring-panel { padding: 1rem; border: 1px solid var(--pico-muted-border-color); border-radius: 1rem; background: var(--pico-card-background-color); }
.scoring-heading { display: flex; align-items: center; justify-content: space-between; gap: .75rem; margin-bottom: .85rem; }
.extra-status { border-radius: 2rem; padding: .35rem .7rem; background: var(--pico-muted-border-color); font-size: .78rem; white-space: nowrap; }
.extra-status.active { background: var(--pico-primary-background); color: white; }
.run-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: .55rem; }
.run-button, .wicket-button { min-height: 4.2rem; margin: 0; padding: .4rem; font-size: 1.55rem; font-weight: 750; border-radius: .8rem; touch-action: manipulation; }
.wicket-button { grid-column: span 2; background: #b42318; border-color: #b42318; color: white; font-size: 1rem; letter-spacing: .04em; }
.extras-section { margin-top: 1.1rem; }
.extras-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: .45rem; }
.extra-button { min-height: 2.8rem; margin: 0; padding: .45rem .25rem; font-size: .82rem; border-radius: .65rem; touch-action: manipulation; }
.extra-button.selected { background: var(--pico-primary); border-color: var(--pico-primary); color: white; }
.control-hint { margin: .75rem 0 0; font-size: .78rem; }
.selection-panel { padding: .25rem 0; }
.selection-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: .55rem; margin-top: .85rem; }
.player-button { min-height: 3.4rem; margin: 0; }
.match-actions { display: grid; grid-template-columns: 1fr 1fr; gap: .6rem; margin: .75rem 0; }
.match-actions button { min-height: 3rem; margin: 0; }
.undo-button { background: var(--pico-secondary-background); border-color: var(--pico-secondary-background); }
.end-button, .reset-button { background: transparent; color: var(--pico-muted-color); border-color: var(--pico-muted-border-color); }
.reset-button { width: 100%; margin-top: .5rem; min-height: 2.8rem; }
@media (max-width: 600px) {
  .team-setup { grid-template-columns: 1fr; }
  .team-card { padding: .8rem; }
  .scoring-panel { padding: .8rem; border-radius: .85rem; }
  .run-grid { gap: .45rem; }
  .run-button, .wicket-button { min-height: 4rem; }
  .extras-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .selection-grid { grid-template-columns: 1fr 1fr; }
}
@media (max-width: 360px) {
  .run-button, .wicket-button { min-height: 3.6rem; }
  .extras-grid, .selection-grid { grid-template-columns: 1fr; }
}
</style>
