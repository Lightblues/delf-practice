import type { EvaluationResponse } from '../../shared/types'

interface EvaluationPanelProps {
  evaluation: EvaluationResponse
}

interface ScoreBarProps {
  label: string
  score: number
  max: number
  feedback: string
}

function ScoreBar({ label, score, max, feedback }: ScoreBarProps) {
  const percentage = (score / max) * 100
  const getColor = () => {
    if (percentage >= 80) return 'var(--color-success)'
    if (percentage >= 60) return 'var(--color-accent)'
    if (percentage >= 40) return 'var(--color-warning)'
    return 'var(--color-error)'
  }

  return (
    <div className="score-item">
      <div className="score-header">
        <span className="score-label">{label}</span>
        <span className="score-value">{score}/{max}</span>
      </div>
      <div className="score-bar-container">
        <div
          className="score-bar-fill"
          style={{
            width: `${percentage}%`,
            backgroundColor: getColor()
          }}
        />
      </div>
      <p className="score-feedback">{feedback}</p>
    </div>
  )
}

export function EvaluationPanel({ evaluation }: EvaluationPanelProps) {
  const { scores, total, wordCount, overallFeedback, strengths, improvements } = evaluation

  const scoreLabels: Record<string, string> = {
    task_completion: 'Réalisation de la tâche',
    coherence_cohesion: 'Cohérence et cohésion',
    sociolinguistic: 'Adéquation sociolinguistique',
    lexique: 'Lexique',
    morphosyntax: 'Morphosyntaxe'
  }

  const totalPercentage = Math.round((total / 25) * 100)

  return (
    <div className="evaluation-panel">
      <div className="evaluation-header">
        <h3>Évaluation</h3>
        <div className="evaluation-total">
          <span className="total-score">{total}</span>
          <span className="total-max">/25</span>
          <span className="total-percentage">({totalPercentage}%)</span>
        </div>
      </div>

      <div className="evaluation-meta">
        <span>Nombre de mots: {wordCount}</span>
      </div>

      <div className="evaluation-scores">
        <ScoreBar
          label={scoreLabels.task_completion}
          score={scores.task_completion.score}
          max={5}
          feedback={scores.task_completion.feedback}
        />
        <ScoreBar
          label={scoreLabels.coherence_cohesion}
          score={scores.coherence_cohesion.score}
          max={5}
          feedback={scores.coherence_cohesion.feedback}
        />
        <ScoreBar
          label={scoreLabels.sociolinguistic}
          score={scores.sociolinguistic.score}
          max={5}
          feedback={scores.sociolinguistic.feedback}
        />
        <ScoreBar
          label={scoreLabels.lexique}
          score={scores.lexique.score}
          max={5}
          feedback={scores.lexique.feedback}
        />
        <ScoreBar
          label={scoreLabels.morphosyntax}
          score={scores.morphosyntax.score}
          max={5}
          feedback={scores.morphosyntax.feedback}
        />
      </div>

      <div className="evaluation-feedback">
        <div className="feedback-section">
          <h4>Commentaire général</h4>
          <p>{overallFeedback}</p>
        </div>

        {strengths.length > 0 && (
          <div className="feedback-section feedback-strengths">
            <h4>Points forts</h4>
            <ul>
              {strengths.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ul>
          </div>
        )}

        {improvements.length > 0 && (
          <div className="feedback-section feedback-improvements">
            <h4>À améliorer</h4>
            <ul>
              {improvements.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}
