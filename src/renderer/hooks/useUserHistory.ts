import { useState, useEffect, useCallback } from 'react'
import { v4 as uuidv4 } from 'uuid'
import type { Part, UserHistory, Session, Answer, ActivityStats, PartStats } from '../../shared/types'

export function useUserHistory() {
  const [history, setHistory] = useState<UserHistory | null>(null)

  useEffect(() => {
    window.electronAPI.loadHistory().then(setHistory)
  }, [])

  const saveSession = useCallback(async (
    part: Part,
    exercise: string,
    activity: string,
    userAnswers: (Answer | null)[],
    correctAnswers: Answer[]
  ) => {
    const validAnswers = userAnswers.filter((a): a is Answer => a !== null)
    const correct = validAnswers.filter((a, i) => a === correctAnswers[i]).length

    const session: Session = {
      id: uuidv4(),
      timestamp: new Date().toISOString(),
      part,
      exercise,
      activity,
      answers: userAnswers,
      correct,
      total: correctAnswers.length
    }

    await window.electronAPI.saveSession(session)

    // Refresh history
    const updated = await window.electronAPI.loadHistory()
    setHistory(updated)

    return session
  }, [])

  const getActivityStats = useCallback((part: Part, exercise: string, activity: string): ActivityStats | null => {
    return history?.stats[part]?.[exercise]?.[activity] ?? null
  }, [history])

  const getPartStats = useCallback((part: Part): PartStats => {
    return history?.stats[part] ?? {}
  }, [history])

  const getTotalCompleted = useCallback((part: Part): number => {
    const partStats = history?.stats[part]
    if (!partStats) return 0
    let count = 0
    for (const ex of Object.values(partStats)) {
      count += Object.keys(ex).length
    }
    return count
  }, [history])

  const refresh = useCallback(async () => {
    const updated = await window.electronAPI.loadHistory()
    setHistory(updated)
  }, [])

  return { history, saveSession, getActivityStats, getPartStats, getTotalCompleted, refresh }
}
