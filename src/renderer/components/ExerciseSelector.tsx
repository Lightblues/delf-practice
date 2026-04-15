import type { Part, ExerciseIndex, PartStats, WritingIndex, SpeakingIndex } from '../../shared/types'

interface ExerciseSelectorProps {
  part: Part
  index: ExerciseIndex | null
  writingIndex?: WritingIndex | null
  speakingIndex?: SpeakingIndex | null
  selectedExercise: string
  selectedActivity: string
  partStats: PartStats
  onPartChange: (part: Part) => void
  onExerciseChange: (exercise: string) => void
  onActivityChange: (activity: string) => void
}

const PART_LABELS: Record<Part, string> = {
  'part-a': 'Part A - Listening',
  'part-b': 'Part B - Reading',
  'part-c': 'Part C - Writing',
  'part-d': 'Part D - Speaking'
}

const WRITING_EXERCISE_LABELS: Record<string, string> = {
  'formal_letter': 'Correspondance',
  'reader_response': 'Réponse lecteurs',
  'article': 'Article'
}

const SPEAKING_EXERCISE_LABELS: Record<string, string> = {
  'monologue_suivi': 'Monologue suivi'
}

// Status indicators: not done / done but not perfect / perfect
function getStatusIcon(stats: PartStats, exercise: string, activity: string): string {
  const actStats = stats[exercise]?.[activity]
  if (!actStats) return ''           // Not done
  if (actStats.bestScore === 100) return '✓'  // Perfect
  return '○'                          // Done but not perfect
}

function getStatusClass(stats: PartStats, exercise: string, activity: string): string {
  const actStats = stats[exercise]?.[activity]
  if (!actStats) return ''
  if (actStats.bestScore === 100) return 'perfect'
  return 'attempted'
}

export function ExerciseSelector({
  part,
  index,
  writingIndex,
  speakingIndex,
  selectedExercise,
  selectedActivity,
  partStats,
  onPartChange,
  onExerciseChange,
  onActivityChange
}: ExerciseSelectorProps) {
  const isWriting = part === 'part-c'
  const isSpeaking = part === 'part-d'

  // Get exercises list
  const exercises = isSpeaking
    ? (speakingIndex ? Object.keys(speakingIndex.exercises) : [])
    : isWriting
      ? (writingIndex ? Object.keys(writingIndex.exercises) : [])
      : (index ? Object.keys(index.exercises) : [])

  // Get activities list
  const activities = isSpeaking
    ? (speakingIndex?.exercises[selectedExercise]?.activities.map(a => ({
        name: `Activite_${a.id}`,
        id: a.id
      })) ?? [])
    : isWriting
      ? (writingIndex?.exercises[selectedExercise]?.activities.map(a => ({
          name: `Activite_${a.id}`,
          id: a.id
        })) ?? [])
      : (index?.exercises[selectedExercise]?.activities.map(a => ({
          name: a.name,
          id: 0
        })) ?? [])

  // Calculate exercise completion stats
  const getExerciseProgress = (exercise: string) => {
    if (isSpeaking) {
      const exActivities = speakingIndex?.exercises[exercise]?.activities ?? []
      const total = exActivities.length
      let completed = 0
      let perfect = 0
      for (const act of exActivities) {
        const stats = partStats[exercise]?.[`Activite_${act.id}`]
        if (stats) {
          completed++
          if (stats.bestScore >= 80) perfect++  // 80% = 20/25 for speaking
        }
      }
      return { total, completed, perfect }
    } else if (isWriting) {
      const exActivities = writingIndex?.exercises[exercise]?.activities ?? []
      const total = exActivities.length
      let completed = 0
      let perfect = 0
      for (const act of exActivities) {
        const stats = partStats[exercise]?.[`Activite_${act.id}`]
        if (stats) {
          completed++
          if (stats.bestScore >= 80) perfect++  // 80% = 20/25 for writing
        }
      }
      return { total, completed, perfect }
    } else {
      const exActivities = index?.exercises[exercise]?.activities ?? []
      const total = exActivities.length
      let completed = 0
      let perfect = 0
      for (const act of exActivities) {
        const stats = partStats[exercise]?.[act.name]
        if (stats) {
          completed++
          if (stats.bestScore === 100) perfect++
        }
      }
      return { total, completed, perfect }
    }
  }

  return (
    <>
      <div className="selector-group">
        <label>Part:</label>
        <select value={part} onChange={e => onPartChange(e.target.value as Part)}>
          <option value="part-a">{PART_LABELS['part-a']}</option>
          <option value="part-b">{PART_LABELS['part-b']}</option>
          <option value="part-c">{PART_LABELS['part-c']}</option>
          <option value="part-d">{PART_LABELS['part-d']}</option>
        </select>
      </div>

      <div className="selector-group">
        <label>Exercise:</label>
        <select
          value={selectedExercise}
          onChange={e => onExerciseChange(e.target.value)}
          disabled={exercises.length === 0}
        >
          {exercises.map(ex => {
            const { total, completed, perfect } = getExerciseProgress(ex)
            const label = isSpeaking
              ? SPEAKING_EXERCISE_LABELS[ex] || ex
              : isWriting
                ? WRITING_EXERCISE_LABELS[ex] || ex
                : ex.replace('_', ' ')
            const progress = completed > 0 ? ` (${perfect}✓ ${completed - perfect}○ / ${total})` : ''
            return (
              <option key={ex} value={ex}>
                {label}{progress}
              </option>
            )
          })}
        </select>
      </div>

      <div className="selector-group">
        <label>Activity:</label>
        <select
          value={selectedActivity}
          onChange={e => onActivityChange(e.target.value)}
          disabled={activities.length === 0}
          className="activity-select"
        >
          {activities.map(act => {
            const icon = getStatusIcon(partStats, selectedExercise, act.name)
            const statusClass = getStatusClass(partStats, selectedExercise, act.name)
            const displayName = (isWriting || isSpeaking)
              ? `Activité ${act.id}`
              : act.name.replace('_', ' ')
            return (
              <option
                key={act.name}
                value={act.name}
                className={statusClass}
              >
                {icon ? `${icon} ` : '　'}{displayName}
              </option>
            )
          })}
        </select>
      </div>
    </>
  )
}
