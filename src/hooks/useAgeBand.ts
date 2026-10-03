import { useCallback, useState } from 'react'
import { type AgeBand, DEFAULT_AGE_BAND, isAgeBand } from '../shared/card'

const STORAGE_KEY = 'kurious:ageBand'

function readAgeBand(): AgeBand {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY)
    return isAgeBand(saved) ? saved : DEFAULT_AGE_BAND
  } catch {
    return DEFAULT_AGE_BAND
  }
}

/** The age band, remembered across visits (a per-device convenience only). */
export function useAgeBand(): [AgeBand, (band: AgeBand) => void] {
  const [band, setBand] = useState<AgeBand>(readAgeBand)
  const update = useCallback((next: AgeBand) => {
    setBand(next)
    try {
      window.localStorage.setItem(STORAGE_KEY, next)
    } catch {
      // Storage blocked: the choice still holds for this visit.
    }
  }, [])
  return [band, update]
}
