import { describe, it, expect } from 'vitest'
import { updatePlayer, type Rating } from '@/lib/calibration/glicko'

const newPlayer = (): Rating => ({ rating: 1500, rd: 350, vol: 0.06 })

describe('Glicko-2 updatePlayer', () => {
  it('rating goes UP after beating a harder opponent', () => {
    const me = { rating: 1500, rd: 200, vol: 0.06 }
    const opp = { rating: 1700, rd: 50, vol: 0.06 }
    const after = updatePlayer(me, [{ opponent: opp, score: 1 }])
    expect(after.rating).toBeGreaterThan(me.rating)
  })

  it('rating goes DOWN after losing to an easier opponent', () => {
    const me = { rating: 1500, rd: 200, vol: 0.06 }
    const opp = { rating: 1300, rd: 50, vol: 0.06 }
    const after = updatePlayer(me, [{ opponent: opp, score: 0 }])
    expect(after.rating).toBeLessThan(me.rating)
  })

  it('RD shrinks after a game (more certain)', () => {
    const me = newPlayer()
    const opp = newPlayer()
    const after = updatePlayer(me, [{ opponent: opp, score: 1 }])
    expect(after.rd).toBeLessThan(me.rd)
  })

  it('high-RD player moves MORE than low-RD player for same result', () => {
    const opp = { rating: 1500, rd: 30, vol: 0.06 }
    const highRd = updatePlayer({ rating: 1500, rd: 350, vol: 0.06 }, [{ opponent: opp, score: 1 }])
    const lowRd = updatePlayer({ rating: 1500, rd: 50, vol: 0.06 }, [{ opponent: opp, score: 1 }])
    expect(highRd.rating - 1500).toBeGreaterThan(lowRd.rating - 1500)
  })
})
