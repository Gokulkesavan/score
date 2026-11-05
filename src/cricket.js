// Pure match logic shared by the scorer and the viewers.
// The whole match is a list of balls; everything else is derived from it.
export const batIdx = (m, inn) => (inn === 0 ? m.first : 1 - m.first)
export const isLegal = b => b.extra !== 'wd' && b.extra !== 'nb'
export const total = b => b.runs + (b.extra === 'wd' || b.extra === 'nb' ? 1 : 0)
export const ov = n => Math.floor(n / 6) + '.' + (n % 6)

export function newMatch(teams, lists, first) {
  let id = 0
  const players = lists.flatMap((names, t) => names.map(name => ({ id: id++, name, team: t })))
  return { teams, players, first, inn: 0, striker: null, nonStriker: null, bowler: null,
           balls: [], finished: false, updatedAt: Date.now() }
}

export function addBall(m, { runs, extra = null, wicket = false }) {
  const b = { inn: m.inn, runs, extra, wicket, striker: m.striker, nonStriker: m.nonStriker, bowler: m.bowler }
  const n = { ...m, balls: [...m.balls, b], updatedAt: Date.now() }
  const swap = () => { [n.striker, n.nonStriker] = [n.nonStriker, n.striker] }
  if (wicket) n.striker = null
  else if (runs % 2) swap()
  const legal = n.balls.filter(x => x.inn === m.inn && isLegal(x)).length
  if (isLegal(b) && legal % 6 === 0) { swap(); n.bowler = null }   // end of over
  return n
}

export function undo(m) {
  const i = m.balls.map(b => b.inn).lastIndexOf(m.inn)
  if (i < 0) return m
  const b = m.balls[i]
  return { ...m, balls: m.balls.filter((_, k) => k !== i), striker: b.striker,
           nonStriker: b.nonStriker, bowler: b.bowler, updatedAt: Date.now() }
}

export function endInnings(m) {
  const n = { ...m, striker: null, nonStriker: null, bowler: null, updatedAt: Date.now() }
  if (m.inn === 0) n.inn = 1; else n.finished = true
  return n
}

export function summarize(m) {
  const inns = [0, 1].map(i => {
    const bat = {}, bowl = {}
    let runs = 0, wkts = 0, legal = 0, extras = 0, over = []
    for (const b of m.balls.filter(x => x.inn === i)) {
      const t = total(b)
      const bt = (bat[b.striker] ??= { runs: 0, balls: 0, fours: 0, sixes: 0, out: false })
      const bw = (bowl[b.bowler] ??= { balls: 0, runs: 0, wkts: 0 })
      runs += t
      if (b.extra !== 'wd') bt.balls++
      if (!b.extra || b.extra === 'nb') {
        bt.runs += b.runs
        if (b.runs === 4) bt.fours++
        if (b.runs === 6) bt.sixes++
      }
      extras += b.extra === 'nb' ? 1 : b.extra ? t : 0
      bw.runs += b.extra === 'b' || b.extra === 'lb' ? 0 : t
      if (isLegal(b)) { legal++; bw.balls++ }
      if (b.wicket) { wkts++; bt.out = true; bw.wkts++ }
      over.push(b.wicket ? 'W' : b.extra ? b.extra + (b.runs || '') : String(b.runs))
      if (isLegal(b) && legal % 6 === 0) over = []
    }
    return { runs, wkts, legal, extras, bat, bowl, over, overs: ov(legal) }
  })
  return { inns }
}

export function resultText(m, S) {
  if (m.inn === 0) return ''
  const t = i => m.teams[batIdx(m, i)]
  const r0 = S.inns[0].runs, r1 = S.inns[1].runs
  if (r1 > r0) {
    const left = m.players.filter(p => p.team === batIdx(m, 1)).length - 1 - S.inns[1].wkts
    return `${t(1)} won by ${left} wicket${left === 1 ? '' : 's'}`
  }
  if (!m.finished) return `${t(1)} need ${r0 + 1 - r1} to win`
  return r0 > r1 ? `${t(0)} won by ${r0 - r1} runs` : 'Match tied'
}
