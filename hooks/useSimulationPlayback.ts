'use client'

/**
 * Playback clock for the narrative beats:
 *   populate → vote → settle → reveal → endcard → done
 *
 * Positions are driven imperatively via callbacks so 150 dots do not force
 * a full React re-render every frame. UI chrome (feed, readouts, controls)
 * subscribes to throttled React state.
 *
 * Capture mode (Task 6): seed all geometry from the run id (see positions.ts);
 * "cinemático" pacing + endcard live here.
 */

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react'
import type {
  SimulationPlaybackSpeed,
  SimulationReplayPayload,
  SimulationReplayVote,
  SimulationViewerBeat,
} from '@/types/simulation-replay'
import {
  BASE_POPULATE_MS,
  BASE_REVEAL_COUNT_MS,
  BASE_VOTE_INTERVAL_MS,
  ENDCARD_HOLD_MS,
  effectiveDeltaMs,
  settleDurationMs,
} from '@/lib/sim-viewer/pacing'
import { roundDivergence } from '@/lib/sim-viewer/format-divergence'

export type PlaybackSnapshot = {
  beat: SimulationViewerBeat
  /** Votes that have "landed" (0..personaCount). */
  votedCount: number
  playing: boolean
  speed: SimulationPlaybackSpeed
  /** 0–1 progress through the vote beat. */
  voteProgress: number
  /** Animated divergence readout during reveal (null until reveal). */
  displayedDivergence: number | null
  reducedMotion: boolean
}

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function subscribeReducedMotion(cb: () => void): () => void {
  if (typeof window === 'undefined') return () => {}
  const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
  mq.addEventListener('change', cb)
  return () => mq.removeEventListener('change', cb)
}

export function useReducedMotion(): boolean {
  return useSyncExternalStore(subscribeReducedMotion, prefersReducedMotion, () => false)
}

export type UseSimulationPlaybackOptions = {
  data: SimulationReplayPayload
  /** Called when a new vote lands (for imperative dot updates + feed). */
  onVoteLand?: (vote: SimulationReplayVote, index: number) => void
  /**
   * When true, start the replay clock on mount. Default false (Task 4c —
   * choose Columnas/Mapa, then click Iniciar). Pass true for `?autoplay=1`
   * or capture mode (`?captura=1`).
   */
  autoplay?: boolean
  /**
   * When true (capture mode), default speed is cinemático and the endcard
   * beat runs after reveal. Non-capture keeps 4× and skips endcard.
   */
  captureMode?: boolean
  /** Cap on reasoning-feed rows (capture phone presets want fewer, larger). */
  feedCap?: number
  /** Initial speed override. */
  initialSpeed?: SimulationPlaybackSpeed
}

export type UseSimulationPlaybackResult = PlaybackSnapshot & {
  play: () => void
  pause: () => void
  restart: () => void
  /**
   * Leave the endcard for a paused, fully-landed view where persona dots
   * are clickable (Explorar personas / capture dismiss).
   */
  explore: () => void
  setSpeed: (speed: SimulationPlaybackSpeed) => void
  /** Latest landed votes for the reasoning feed (capped). */
  feedVotes: SimulationReplayVote[]
  meanConfidence: number | null
}

export function useSimulationPlayback({
  data,
  onVoteLand,
  // Task 4c: choose format first — do not start until the user clicks
  // "Iniciar simulación" (or ?autoplay=1 / ?captura=1 opts in).
  autoplay = false,
  captureMode = false,
  feedCap = 16,
  initialSpeed,
}: UseSimulationPlaybackOptions): UseSimulationPlaybackResult {
  const reducedMotion = useReducedMotion()
  const total = data.votes.length
  const targetDivergence = data.run.divergenceIndex
  const defaultSpeed: SimulationPlaybackSpeed =
    initialSpeed ?? (captureMode ? 'cinematic' : 4)
  const feedLimit = feedCap

  const [beat, setBeat] = useState<SimulationViewerBeat>(
    reducedMotion ? 'done' : 'populate'
  )
  const [votedCount, setVotedCount] = useState(reducedMotion ? total : 0)
  const [playing, setPlaying] = useState(!reducedMotion && autoplay)
  const [speed, setSpeed] = useState<SimulationPlaybackSpeed>(defaultSpeed)
  const [displayedDivergence, setDisplayedDivergence] = useState<number | null>(
    reducedMotion ? roundDivergence(targetDivergence) : null
  )
  const [feedVotes, setFeedVotes] = useState<SimulationReplayVote[]>(
    reducedMotion ? data.votes.slice().reverse().slice(0, feedLimit) : []
  )

  const votedCountRef = useRef(votedCount)
  const beatRef = useRef(beat)
  const playingRef = useRef(playing)
  const speedRef = useRef(speed)
  const captureRef = useRef(captureMode)
  const rafRef = useRef<number | null>(null)
  const lastTsRef = useRef<number | null>(null)
  const accMsRef = useRef(0)
  const onVoteLandRef = useRef(onVoteLand)
  onVoteLandRef.current = onVoteLand
  captureRef.current = captureMode

  useEffect(() => {
    votedCountRef.current = votedCount
  }, [votedCount])
  useEffect(() => {
    beatRef.current = beat
  }, [beat])
  useEffect(() => {
    playingRef.current = playing
  }, [playing])
  useEffect(() => {
    speedRef.current = speed
  }, [speed])

  useEffect(() => {
    setFeedVotes((prev) => prev.slice(0, feedLimit))
  }, [feedLimit])

  // Hydration: useSyncExternalStore may report reduced-motion only after
  // mount. Jump straight to the settled / endcard-ready state when it does.
  useEffect(() => {
    if (!reducedMotion) return
    beatRef.current = 'done'
    votedCountRef.current = total
    playingRef.current = false
    setBeat('done')
    setVotedCount(total)
    setDisplayedDivergence(roundDivergence(targetDivergence))
    setFeedVotes(data.votes.slice().reverse().slice(0, feedLimit))
    setPlaying(false)
  }, [reducedMotion, total, targetDivergence, data.votes, feedLimit])

  // When entering capture mode mid-session, prefer cinemático if still on the
  // non-capture default (4×). Leave an explicit 1×/2× choice alone.
  useEffect(() => {
    if (captureMode && speedRef.current !== 'cinematic' && !initialSpeed) {
      setSpeed((s) => (s === 4 ? 'cinematic' : s))
    }
  }, [captureMode, initialSpeed])

  const landVote = useCallback(
    (index: number) => {
      const vote = data.votes[index]
      if (!vote) return
      // Advance the ref synchronously so a single rAF tick that lands
      // multiple votes never re-uses the same index (duplicate feed keys).
      votedCountRef.current = index + 1
      onVoteLandRef.current?.(vote, index)
      setVotedCount(index + 1)
      setFeedVotes((prev) => {
        if (prev.some((v) => v.sequenceIndex === vote.sequenceIndex)) return prev
        return [vote, ...prev].slice(0, feedLimit)
      })
    },
    [data.votes, feedLimit]
  )

  const restart = useCallback(() => {
    lastTsRef.current = null
    accMsRef.current = 0
    if (prefersReducedMotion()) {
      setBeat('done')
      setVotedCount(total)
      setDisplayedDivergence(roundDivergence(targetDivergence))
      setFeedVotes(data.votes.slice().reverse().slice(0, feedLimit))
      setPlaying(false)
      return
    }
    // Keep the rAF loop alive — only reset clock state. Cancelling the
    // frame here used to leave playback dead until a full remount.
    // Update refs synchronously so the in-flight tick sees the new beat.
    beatRef.current = 'populate'
    votedCountRef.current = 0
    playingRef.current = true
    setBeat('populate')
    setVotedCount(0)
    setDisplayedDivergence(null)
    setFeedVotes([])
    setPlaying(true)
  }, [data.votes, feedLimit, targetDivergence, total])

  /** Endcard → paused landed view (dots clickable). */
  const explore = useCallback(() => {
    lastTsRef.current = null
    accMsRef.current = 0
    beatRef.current = 'done'
    votedCountRef.current = total
    playingRef.current = false
    setBeat('done')
    setVotedCount(total)
    setDisplayedDivergence(roundDivergence(targetDivergence))
    setFeedVotes(data.votes.slice().reverse().slice(0, feedLimit))
    setPlaying(false)
  }, [data.votes, feedLimit, targetDivergence, total])

  const play = useCallback(() => {
    if (beatRef.current === 'done' || beatRef.current === 'endcard') {
      restart()
      return
    }
    setPlaying(true)
  }, [restart])

  const pause = useCallback(() => {
    setPlaying(false)
  }, [])

  // Main clock
  useEffect(() => {
    if (reducedMotion) return

    const tick = (ts: number) => {
      rafRef.current = requestAnimationFrame(tick)
      if (!playingRef.current) {
        lastTsRef.current = ts
        return
      }
      const last = lastTsRef.current ?? ts
      const wallDt = ts - last
      lastTsRef.current = ts
      const dt = effectiveDeltaMs(
        wallDt,
        speedRef.current,
        votedCountRef.current,
        total,
        beatRef.current
      )
      accMsRef.current += dt

      const currentBeat = beatRef.current

      if (currentBeat === 'populate') {
        if (accMsRef.current >= BASE_POPULATE_MS) {
          accMsRef.current = 0
          setBeat('vote')
        }
        return
      }

      if (currentBeat === 'vote') {
        while (accMsRef.current >= BASE_VOTE_INTERVAL_MS) {
          accMsRef.current -= BASE_VOTE_INTERVAL_MS
          const next = votedCountRef.current
          if (next >= total) {
            setBeat('settle')
            accMsRef.current = 0
            break
          }
          landVote(next)
        }
        return
      }

      if (currentBeat === 'settle') {
        const settleMs = settleDurationMs(speedRef.current)
        if (accMsRef.current >= settleMs) {
          accMsRef.current = 0
          setBeat('reveal')
          // Keep null when the run has no stored index — never coerce to 0
          // (0 means "IA nos leyó perfecto", which is a real score).
          setDisplayedDivergence(
            targetDivergence === null ? null : 0
          )
        }
        return
      }

      if (currentBeat === 'reveal') {
        // Missing divergence stays "—" through reveal + endcard.
        if (targetDivergence === null) {
          setDisplayedDivergence(null)
          if (accMsRef.current >= BASE_REVEAL_COUNT_MS) {
            accMsRef.current = 0
            setBeat('endcard')
          }
          return
        }
        const target = targetDivergence
        const roundedTarget = roundDivergence(target) ?? 0
        const t = Math.min(1, accMsRef.current / BASE_REVEAL_COUNT_MS)
        // ease-out — always integer frames so the count-up never shows decimals
        const eased = 1 - Math.pow(1 - t, 3)
        setDisplayedDivergence(Math.round(roundedTarget * eased))
        if (t >= 1) {
          setDisplayedDivergence(roundedTarget)
          accMsRef.current = 0
          // Both modes land on the endcard. Capture holds a clean frame;
          // normal mode shows Ver de nuevo / Explorar personas.
          setBeat('endcard')
        }
        return
      }

      if (currentBeat === 'endcard') {
        // Capture: hold ENDCARD_HOLD_MS for a clean recording frame, then
        // pause while staying on endcard (dismiss via click / R).
        // Normal: pause immediately — buttons drive restart / explore.
        if (!captureRef.current || accMsRef.current >= ENDCARD_HOLD_MS) {
          setPlaying(false)
        }
      }
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
    }
  }, [landVote, reducedMotion, targetDivergence, total])

  const meanConfidence =
    votedCount === 0
      ? null
      : data.votes
          .slice(0, votedCount)
          .reduce((s, v) => s + v.confidence, 0) / votedCount

  return {
    beat,
    votedCount,
    playing,
    speed,
    voteProgress: total === 0 ? 0 : votedCount / total,
    displayedDivergence,
    reducedMotion,
    play,
    pause,
    restart,
    explore,
    setSpeed,
    feedVotes,
    meanConfidence,
  }
}
