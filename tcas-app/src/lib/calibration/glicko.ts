export interface Rating { rating: number; rd: number; vol: number }
export interface GameResult { opponent: Rating; score: number } // score: 1=ถูก, 0=ผิด

const SCALE = 173.7178
const TAU = 0.5 // system constant (tune §9)

const toMu = (r: number) => (r - 1500) / SCALE
const toPhi = (rd: number) => rd / SCALE
const g = (phi: number) => 1 / Math.sqrt(1 + (3 * phi * phi) / (Math.PI * Math.PI))
const E = (mu: number, muj: number, phij: number) =>
  1 / (1 + Math.exp(-g(phij) * (mu - muj)))

export function updatePlayer(player: Rating, games: GameResult[]): Rating {
  const mu = toMu(player.rating)
  const phi = toPhi(player.rd)
  const sigma = player.vol

  if (games.length === 0) {
    const phiStar = Math.sqrt(phi * phi + sigma * sigma)
    return { rating: player.rating, rd: phiStar * SCALE, vol: sigma }
  }

  let vInv = 0, delta = 0
  for (const { opponent, score } of games) {
    const muj = toMu(opponent.rating), phij = toPhi(opponent.rd)
    const gj = g(phij), Ej = E(mu, muj, phij)
    vInv += gj * gj * Ej * (1 - Ej)
    delta += gj * (score - Ej)
  }
  const v = 1 / vInv
  const deltaVal = v * delta

  // volatility update (Illinois algorithm)
  const a = Math.log(sigma * sigma)
  const f = (x: number) => {
    const ex = Math.exp(x)
    const t1 = (ex * (deltaVal * deltaVal - phi * phi - v - ex)) /
      (2 * Math.pow(phi * phi + v + ex, 2))
    const t2 = (x - a) / (TAU * TAU)
    return t1 - t2
  }
  let A = a
  let B: number
  if (deltaVal * deltaVal > phi * phi + v) {
    B = Math.log(deltaVal * deltaVal - phi * phi - v)
  } else {
    let k = 1
    while (f(a - k * TAU) < 0) k++
    B = a - k * TAU
  }
  let fA = f(A), fB = f(B)
  while (Math.abs(B - A) > 1e-6) {
    const C = A + ((A - B) * fA) / (fB - fA)
    const fC = f(C)
    if (fC * fB <= 0) { A = B; fA = fB } else { fA /= 2 }
    B = C; fB = fC
  }
  const newSigma = Math.exp(A / 2)

  const phiStar = Math.sqrt(phi * phi + newSigma * newSigma)
  const newPhi = 1 / Math.sqrt(1 / (phiStar * phiStar) + 1 / v)
  const newMu = mu + newPhi * newPhi * delta

  return { rating: newMu * SCALE + 1500, rd: newPhi * SCALE, vol: newSigma }
}
