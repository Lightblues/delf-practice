import { useState, useEffect } from 'react'
import type { Part, ExerciseIndex, AnswerData } from '../../shared/types'

interface ExerciseDataState {
  index: ExerciseIndex | null
  answers: AnswerData | null
  loading: boolean
  error: string | null
}

export function useExerciseData(part: Part) {
  const [state, setState] = useState<ExerciseDataState>({
    index: null,
    answers: null,
    loading: true,
    error: null
  })

  useEffect(() => {
    // Part C uses WritingIndex loaded separately in App.tsx
    if (part === 'part-c') {
      setState({ index: null, answers: null, loading: false, error: null })
      return
    }
    setState({ index: null, answers: null, loading: true, error: null })
    async function load() {
      try {
        const [index, answers] = await Promise.all([
          window.electronAPI.loadIndex(part),
          window.electronAPI.loadAnswers(part)
        ])
        setState({ index, answers, loading: false, error: null })
      } catch (err) {
        setState(prev => ({
          ...prev,
          loading: false,
          error: err instanceof Error ? err.message : 'Failed to load data'
        }))
      }
    }
    load()
  }, [part])

  return state
}
