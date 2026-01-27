import type { Part } from '../../shared/types'

interface StatusBarProps {
  part: Part
  totalActivities: number
  completedCount: number
  currentStats: { attempts: number; bestScore: number } | null
  isWriting?: boolean
  isSpeaking?: boolean
}

const PART_NAMES: Record<Part, string> = {
  'part-a': 'Listening',
  'part-b': 'Reading',
  'part-c': 'Writing',
  'part-d': 'Speaking'
}

export function StatusBar({ part, totalActivities, completedCount, currentStats, isWriting, isSpeaking }: StatusBarProps) {
  const isScoreOut25 = isWriting || isSpeaking
  const scoreLabel = isScoreOut25 ? '/25' : '%'
  const displayScore = isScoreOut25 && currentStats
    ? Math.round(currentStats.bestScore * 25 / 100)  // Convert percentage back to /25
    : currentStats?.bestScore

  return (
    <div className="status-bar">
      <span>
        {PART_NAMES[part]}: {completedCount} / {totalActivities} activities completed
      </span>
      {currentStats && (
        <span>
          This activity: {currentStats.attempts} attempts, best score:{' '}
          <span className="score">
            {displayScore}{scoreLabel}
          </span>
        </span>
      )}
    </div>
  )
}
