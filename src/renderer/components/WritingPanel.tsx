import { useState, useCallback, useMemo, useEffect } from 'react'
import type { WritingActivity, WritingAnswer, EvaluationResponse, WritingSession } from '../../shared/types'
import { EvaluationPanel } from './EvaluationPanel'
import { NoteEditor } from './NoteEditor'

interface WritingPanelProps {
  activity: WritingActivity
  exerciseId: string
  activityName: string
  modelAnswer?: WritingAnswer | null
  onSessionSaved?: () => void
}

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(w => w.length > 0).length
}

function formatDate(timestamp: string): string {
  const date = new Date(timestamp)
  return date.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

export function WritingPanel({ activity, exerciseId, activityName, modelAnswer, onSessionSaved }: WritingPanelProps) {
  const [userText, setUserText] = useState('')
  const [isEvaluating, setIsEvaluating] = useState(false)
  const [evaluation, setEvaluation] = useState<EvaluationResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showModelAnswer, setShowModelAnswer] = useState(false)

  // History state
  const [pastSessions, setPastSessions] = useState<WritingSession[]>([])
  const [showHistory, setShowHistory] = useState(false)
  const [loadedSessionId, setLoadedSessionId] = useState<string | null>(null)

  // Load past sessions when activity changes
  useEffect(() => {
    window.electronAPI.getWritingSessions(exerciseId, activityName)
      .then(sessions => setPastSessions(sessions))
      .catch(err => console.error('Failed to load history:', err))
  }, [exerciseId, activityName])

  const wordCount = useMemo(() => countWords(userText), [userText])
  const minWords = 250
  const meetsMinimum = wordCount >= minWords

  const handleEvaluate = useCallback(async () => {
    if (!meetsMinimum) {
      setError(`Minimum ${minWords} mots requis. Vous avez ${wordCount} mots.`)
      return
    }

    setIsEvaluating(true)
    setError(null)

    try {
      const result = await window.electronAPI.evaluateWriting(activity, userText)
      setEvaluation(result)

      // Save session
      const session: WritingSession = {
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        part: 'part-c',
        exercise: exerciseId,
        activity: activityName,
        activityId: activity.id,
        userText,
        wordCount,
        evaluation: result
      }
      await window.electronAPI.saveWritingSession(session)
      onSessionSaved?.()

      // Refresh history
      const sessions = await window.electronAPI.getWritingSessions(exerciseId, activityName)
      setPastSessions(sessions)
      setLoadedSessionId(null) // New session, clear loaded marker
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Evaluation failed')
    } finally {
      setIsEvaluating(false)
    }
  }, [activity, userText, wordCount, meetsMinimum, exerciseId, activityName, onSessionSaved])

  const handleReset = useCallback(() => {
    setUserText('')
    setEvaluation(null)
    setError(null)
    setLoadedSessionId(null)
    setShowModelAnswer(false)
  }, [])

  const handleLoadSession = useCallback((session: WritingSession) => {
    setUserText(session.userText)
    setEvaluation(session.evaluation)
    setLoadedSessionId(session.id)
    setShowHistory(false)
    setError(null)
  }, [])

  // Build prompt display
  const promptContent = useMemo(() => {
    const parts: { label: string; text: string }[] = []

    if (activity.type === 'formal_letter') {
      if (activity.context) parts.push({ label: 'Contexte', text: activity.context })
      parts.push({ label: 'Tâche', text: activity.task })
    } else if (activity.type === 'reader_response') {
      if (activity.stimulus) parts.push({ label: 'Message', text: activity.stimulus })
      if (activity.context) parts.push({ label: 'Contexte', text: activity.context })
      parts.push({ label: 'Tâche', text: activity.task })
    } else {
      if (activity.topic) parts.push({ label: 'Sujet', text: activity.topic })
      parts.push({ label: 'Tâche', text: activity.task })
    }

    return parts
  }, [activity])

  const typeLabels: Record<string, string> = {
    formal_letter: 'Lettre formelle',
    reader_response: 'Réponse au courrier des lecteurs',
    article: 'Article'
  }

  return (
    <div className="writing-panel">
      {/* Prompt Section */}
      <div className="writing-prompt">
        <div className="prompt-header">
          <span className="prompt-type">{typeLabels[activity.type]}</span>
          <span className="prompt-requirement">{activity.requirements}</span>
          {pastSessions.length > 0 && (
            <button
              className="history-toggle"
              onClick={() => setShowHistory(!showHistory)}
              title={`${pastSessions.length} tentative(s) précédente(s)`}
            >
              📋 {pastSessions.length}
            </button>
          )}
        </div>
        <div className="prompt-content">
          {promptContent.map((part, i) => (
            <div key={i} className="prompt-section">
              <span className="prompt-label">{part.label}:</span>
              <span className="prompt-text">{part.text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* History Panel */}
      {showHistory && pastSessions.length > 0 && (
        <div className="history-panel">
          <h4>Historique des tentatives</h4>
          <div className="history-list">
            {pastSessions.map(session => (
              <div
                key={session.id}
                className={`history-item ${loadedSessionId === session.id ? 'active' : ''}`}
                onClick={() => handleLoadSession(session)}
              >
                <div className="history-item-info">
                  <span className="history-date">{formatDate(session.timestamp)}</span>
                  <span className="history-score">{session.evaluation.total}/25</span>
                  <span className="history-words">{session.wordCount} mots</span>
                </div>
                <button className="history-load-btn">Charger</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Loaded session indicator */}
      {loadedSessionId && (
        <div className="loaded-session-indicator">
          Tentative précédente chargée - Modifiez et soumettez à nouveau pour créer une nouvelle évaluation
        </div>
      )}

      {/* Writing Area */}
      <div className="writing-area">
        <textarea
          value={userText}
          onChange={(e) => {
            setUserText(e.target.value)
            if (loadedSessionId && e.target.value !== pastSessions.find(s => s.id === loadedSessionId)?.userText) {
              // User modified loaded text, clear loaded indicator
              setLoadedSessionId(null)
              setEvaluation(null)
            }
          }}
          placeholder="Rédigez votre texte ici..."
          disabled={isEvaluating}
          className="writing-textarea"
        />
        <div className="word-counter">
          <span className={meetsMinimum ? 'word-count-ok' : 'word-count-low'}>
            {wordCount}
          </span>
          <span className="word-count-separator">/</span>
          <span className="word-count-min">{minWords} mots</span>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="writing-error">
          {error}
        </div>
      )}

      {/* Action Buttons */}
      <div className="writing-actions">
        <button
          onClick={() => setShowModelAnswer(!showModelAnswer)}
          className="btn-secondary"
        >
          {showModelAnswer ? 'Masquer la réponse modèle' : 'Voir réponse modèle'}
        </button>
        <button
          onClick={handleReset}
          disabled={isEvaluating}
          className="btn-secondary"
        >
          Effacer
        </button>
        <button
          onClick={handleEvaluate}
          disabled={isEvaluating || wordCount === 0}
          className="btn-primary"
        >
          {isEvaluating ? 'Évaluation en cours...' : 'Soumettre pour évaluation'}
        </button>
      </div>

      {/* Model Answer */}
      {showModelAnswer && modelAnswer && (
        <div className="model-answer">
          <h4>Réponse modèle</h4>
          <div className="answer-content">
            {modelAnswer.content.split('\n').map((line, i) => (
              <p key={i}>{line || '\u00A0'}</p>
            ))}
          </div>
        </div>
      )}

      {/* Evaluation Results */}
      {evaluation && (
        <EvaluationPanel evaluation={evaluation} />
      )}

      {/* Note Editor */}
      <NoteEditor part="part-c" exercise={exerciseId} activity={activityName} />
    </div>
  )
}
