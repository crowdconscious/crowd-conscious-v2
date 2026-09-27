'use client'

/**
 * Playback clock for the four narrative beats:
 *   populate → vote → settle → reveal → done
 *
 * Positions are driven imperatively via callbacks so 150 dots do not force
 * a full React re-render every frame. UI chrome (feed, readouts, controls)
 * subscribes to throttled React state.
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

const POPULATE_MS = 1200
const VOTE_INTERVAL_MS = 70
const SETTLE_MS = 900
const REVEAL_COUNT_MS = 1600

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
  autoplay?: boolean
}

export type UseSimulationPlaybackResult = PlaybackSnapshot & {
  play: () => void
  pause: () => void
  restart: () => void
  setSpeed: (speed: SimulationPlaybackSpeed) => void
  /** Latest landed votes for the reasoning feed (capped). */
  feedVotes: SimulationReplayVote[]
  meanConfidence: number | null
}

export function useSimulationPlayback({
  data,
  onVoteLand,
  autoplay = true,
}: UseSimulationPlaybackOptions): UseSimulationPlaybackResult {
  const reducedMotion = useReducedMotion()
  const total = data.votes.length
  const targetDivergence = data.run.divergenceIndex

  const [beat, setBeat] = useState<SimulationViewerBeat>(
    reducedMotion ? 'done' : 'populate'
  )
  const [votedCount, setVotedCount] = useState(reducedMotion ? total : 0)
  const [playing, setPlaying] = useState(!reducedMotion && autoplay)
  const [speed, setSpeed] = useState<SimulationPlaybackSpeed>(4)
  const [displayedDivergence, setDisplayedDivergence] = useState<number | null>(
    reducedMotion ? targetDivergence : null
  )
  const [feedVotes, setFeedVotes] = useState<SimulationReplayVote[]>(
    reducedMotion ? data.votes.slice().reverse().slice(0, 12) : []
  )

  const votedCountRef = useRef(votedCount)
  const beatRef = useRef(beat)
  const playingRef = useRef(playing)
  const speedRef = useRef(speed)
  const rafRef = useRef<number | null>(null)
  const lastTsRef = useRef<number | null>(null)
  const accMsRef = useRef(0)
  const onVoteLandRef = useRef(onVoteLand)
  onVoteLandRef.current = onVoteLand

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

  const landVote = useCallback(
    (index: number) => {
      const vote = data.votes[index]
      if (!vote) return
      onVoteLandRef.current?.(vote, index)
      setVotedCount(index + 1)
      setFeedVotes((prev) => {
        const next = [vote, ...prev]
        return next.slice(0, 16)
      })
    },
    [data.votes]
  )

  const restart = useCallback(() => {
    lastTsRef.current = null
    accMsRef.current = 0
    if (prefersReducedMotion()) {
      setBeat('done')
      setVotedCount(total)
      setDisplayedDivergence(targetDivergence)
      setFeedVotes(data.votes.slice().reverse().slice(0, 12))
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
  }, [data.votes, targetDivergence, total])

  const play = useCallback(() => {
    if (beatRef.current === 'done') {
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
      const dt = (ts - last) * speedRef.current
      lastTsRef.current = ts
      accMsRef.current += dt

      const currentBeat = beatRef.current

      if (currentBeat === 'populate') {
        if (accMsRef.current >= POPULATE_MS) {
          accMsRef.current = 0
          setBeat('vote')
        }
        return
      }

      if (currentBeat === 'vote') {
        while (accMsRef.current >= VOTE_INTERVAL_MS) {
          accMsRef.current -= VOTE_INTERVAL_MS
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
        if (accMsRef.current >= SETTLE_MS) {
          accMsRef.current = 0
          setBeat('reveal')
          setDisplayedDivergence(0)
        }
        return
      }

      if (currentBeat === 'reveal') {
        const target = targetDivergence ?? 0
        const t = Math.min(1, accMsRef.current / REVEAL_COUNT_MS)
        // ease-out
        const eased = 1 - Math.pow(1 - t, 3)
        setDisplayedDivergence(Math.round(target * eased))
        if (t >= 1) {
          setDisplayedDivergence(target)
          setBeat('done')
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
    setSpeed,
    feedVotes,
    meanConfidence,
  }
}
