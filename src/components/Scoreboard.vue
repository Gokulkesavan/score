<script setup>
import { computed } from 'vue'
import { summarize, resultText, batIdx, ov } from '../cricket.js'

const props = defineProps({ match: Object })
const m = computed(() => props.match)
const S = computed(() => summarize(m.value))
const cur = computed(() => S.value.inns[m.value.inn])
const team = i => m.value.teams[batIdx(m.value, i)]
const nm = id => (id == null ? '—' : m.value.players[id].name)
const result = computed(() => resultText(m.value, S.value))
const sr = b => (b.balls ? ((b.runs / b.balls) * 100).toFixed(0) : '–')

const crease = computed(() => {
  const { striker, nonStriker } = m.value
  return [striker, nonStriker].filter(x => x != null)
})
const batters = i => {
  const ids = Object.keys(S.value.inns[i].bat).map(Number)
  if (i === m.value.inn) crease.value.forEach(id => { if (!ids.includes(id)) ids.push(id) })
  return ids
}
const stat = (i, id) => S.value.inns[i].bat[id] || { runs: 0, balls: 0, fours: 0, sixes: 0, out: false }
const bowlerStat = computed(() => cur.value.bowl[m.value.bowler])
</script>

<template>
  <article>
    <header>
      <strong>{{ team(match.inn) }}</strong>
      <h2 style="margin:0">{{ cur.runs }}/{{ cur.wkts }} <small>({{ cur.overs }} ov)</small></h2>
    </header>
    <p v-if="match.inn === 1">{{ team(0) }}: {{ S.inns[0].runs }}/{{ S.inns[0].wkts }} ({{ S.inns[0].overs }} ov)</p>
    <p v-if="result"><mark>{{ result }}</mark></p>
    <p>This over: <strong>{{ cur.over.join('  ') || '–' }}</strong></p>

    <table>
      <thead><tr><th>Batter</th><th>R</th><th>B</th><th>4s</th><th>6s</th><th>SR</th></tr></thead>
      <tbody>
        <tr v-for="id in crease" :key="id">
          <td>{{ nm(id) }}<span v-if="id === match.striker"> *</span></td>
          <td>{{ stat(match.inn, id).runs }}</td><td>{{ stat(match.inn, id).balls }}</td>
          <td>{{ stat(match.inn, id).fours }}</td><td>{{ stat(match.inn, id).sixes }}</td>
          <td>{{ sr(stat(match.inn, id)) }}</td>
        </tr>
      </tbody>
    </table>
    <p v-if="match.bowler != null">
      Bowling: {{ nm(match.bowler) }}
      <span v-if="bowlerStat">{{ ov(bowlerStat.balls) }}-{{ bowlerStat.runs }}-{{ bowlerStat.wkts }}</span>
    </p>

    <details>
      <summary role="button" class="secondary">Full scorecard</summary>
      <template v-for="i in (match.inn === 1 ? [0, 1] : [0])" :key="i">
        <h4>{{ team(i) }} — {{ S.inns[i].runs }}/{{ S.inns[i].wkts }} ({{ S.inns[i].overs }})</h4>
        <table>
          <thead><tr><th>Batter</th><th>R</th><th>B</th><th>4s</th><th>6s</th><th>SR</th></tr></thead>
          <tbody>
            <tr v-for="id in batters(i)" :key="id">
              <td>{{ nm(id) }}<small v-if="!stat(i, id).out && (i < match.inn || crease.includes(id))"> not out</small></td>
              <td>{{ stat(i, id).runs }}</td><td>{{ stat(i, id).balls }}</td>
              <td>{{ stat(i, id).fours }}</td><td>{{ stat(i, id).sixes }}</td><td>{{ sr(stat(i, id)) }}</td>
            </tr>
          </tbody>
        </table>
        <p><small>Extras: {{ S.inns[i].extras }}</small></p>
        <table>
          <thead><tr><th>Bowler</th><th>O</th><th>R</th><th>W</th></tr></thead>
          <tbody>
            <tr v-for="(b, id) in S.inns[i].bowl" :key="id">
              <td>{{ nm(Number(id)) }}</td><td>{{ ov(b.balls) }}</td><td>{{ b.runs }}</td><td>{{ b.wkts }}</td>
            </tr>
          </tbody>
        </table>
      </template>
    </details>
  </article>
</template>
