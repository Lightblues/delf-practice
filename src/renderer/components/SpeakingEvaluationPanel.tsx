import { useState } from 'react'
import type { SpeakingEvaluationResponse } from '../../shared/types'

interface SpeakingEvaluationPanelProps {
  evaluation: SpeakingEvaluationResponse
}

const SCORE_LABELS: Record<string, string> = {
  monologue_suivi: 'Monologue suivi',
  interaction: 'Exercice en interaction',
  lexique: 'Lexique',
  morphosyntax: 'Morphosyntaxe',
  phonologie: 'Système phonologique'
}

const SCORE_CATEGORIES: Record<string, string[]> = {
  'Compétences pragmatique et sociolinguistique': ['monologue_suivi', 'interaction'],
  'Compétence linguistique': ['lexique', 'morphosyntax', 'phonologie']
}

function ScoreBar({ score, max = 5 }: { score: number; max?: number }) {
  const percentage = (score / max) * 100
  const getColor = () => {
    if (percentage >= 80) return 'var(--success)'
    if (percentage >= 50) return 'var(--accent)'
    return 'var(--error)'
  }

  return (
    <div className="score-bar-container">
      <div
        className="score-bar-fill"
        style={{ width: `${percentage}%`, backgroundColor: getColor() }}
      />
    </div>
  )
}

export function SpeakingEvaluationPanel({ evaluation }: SpeakingEvaluationPanelProps) {
  const [showTranscription, setShowTranscription] = useState(false)
  const { scores, total, transcription, overallFeedback, strengths, improvements } = evaluation

  const scorePercentage = Math.round((total / 25) * 100)
  const getScoreClass = () => {
    if (scorePercentage >= 80) return 'score-excellent'
    if (scorePercentage >= 60) return 'score-good'
    if (scorePercentage >= 40) return 'score-fair'
    return 'score-poor'
  }

  return (
    <div className="speaking-evaluation-panel">
      <div className="evaluation-header">
        <h3>ÉVALUATION</h3>
        <div className={`total-score ${getScoreClass()}`}>
          Score: {total}/25
        </div>
      </div>

      <div className="scores-grid">
        {Object.entries(SCORE_CATEGORIES).map(([category, criteriaKeys]) => (
          <div key={category} className="score-category">
            <h4 className="category-title">{category}:</h4>
            {criteriaKeys.map(key => {
              const criterion = scores[key as keyof typeof scores]
              if (!criterion) return null
              return (
                <div key={key} className="score-item">
                  <div className="score-label">{SCORE_LABELS[key]}</div>
                  <div className="score-visual">
                    <ScoreBar score={criterion.score} />
                    <span className="score-value">{criterion.score}/5</span>
                  </div>
                  <div className="score-feedback">{criterion.feedback}</div>
                </div>
              )
            })}
          </div>
        ))}
      </div>

      {/* Transcription toggle */}
      <div className="transcription-section">
        <button
          onClick={() => setShowTranscription(!showTranscription)}
          className="btn-text"
        >
          {showTranscription ? '▼ Masquer la transcription' : '▶ Voir la transcription'}
        </button>
        {showTranscription && transcription && (
          <div className="transcription-content">
            <p>{transcription}</p>
          </div>
        )}
      </div>

      {/* Overall feedback */}
      <div className="feedback-section">
        <h4>Commentaire général</h4>
        <p className="overall-feedback">{overallFeedback}</p>
      </div>

      {/* Strengths and improvements */}
      <div className="feedback-lists">
        {strengths.length > 0 && (
          <div className="strengths">
            <h4>Points forts</h4>
            <ul>
              {strengths.map((s, i) => (
                <li key={i}>• {s}</li>
              ))}
            </ul>
          </div>
        )}

        {improvements.length > 0 && (
          <div className="improvements">
            <h4>À améliorer</h4>
            <ul>
              {improvements.map((s, i) => (
                <li key={i}>• {s}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}
