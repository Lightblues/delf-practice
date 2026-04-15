import { useState, useCallback, useMemo, useRef, useEffect } from 'react'
import type { SpeakingActivity, SpeakingAnswer, SpeakingEvaluationResponse, SpeakingSession } from '../../shared/types'
import { SpeakingEvaluationPanel } from './SpeakingEvaluationPanel'
import { NoteEditor } from './NoteEditor'

interface SpeakingPanelProps {
  activity: SpeakingActivity
  exerciseId: string
  activityName: string
  modelAnswer?: SpeakingAnswer | null
  onSessionSaved?: () => void
}

type RecordingState = 'idle' | 'recording' | 'paused' | 'recorded'

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

function formatDurationShort(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

export function SpeakingPanel({ activity, exerciseId, activityName, modelAnswer, onSessionSaved }: SpeakingPanelProps) {
  const [recordingState, setRecordingState] = useState<RecordingState>('idle')
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [duration, setDuration] = useState(0)
  const [isEvaluating, setIsEvaluating] = useState(false)
  const [evaluation, setEvaluation] = useState<SpeakingEvaluationResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showModelAnswer, setShowModelAnswer] = useState(false)

  // History state
  const [pastSessions, setPastSessions] = useState<SpeakingSession[]>([])
  const [showHistory, setShowHistory] = useState(false)
  const [loadedSessionId, setLoadedSessionId] = useState<string | null>(null)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  // Load past sessions when activity changes
  useEffect(() => {
    window.electronAPI.getSpeakingSessions(exerciseId, activityName)
      .then(sessions => setPastSessions(sessions))
      .catch(err => console.error('Failed to load history:', err))
  }, [exerciseId, activityName])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      if (audioUrl) URL.revokeObjectURL(audioUrl)
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop()
      }
    }
  }, [audioUrl])

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      })

      audioChunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        setAudioBlob(blob)
        const url = URL.createObjectURL(blob)
        setAudioUrl(url)
        setRecordingState('recorded')

        // Stop all tracks
        stream.getTracks().forEach(track => track.stop())
      }

      mediaRecorderRef.current = mediaRecorder
      mediaRecorder.start(1000) // Collect data every second

      // Start timer
      setDuration(0)
      timerRef.current = setInterval(() => {
        setDuration(d => d + 1)
      }, 1000)

      setRecordingState('recording')
      setError(null)
      setEvaluation(null)
      setLoadedSessionId(null)
    } catch (err) {
      setError('Impossible d\'accéder au microphone. Veuillez vérifier les permissions.')
      console.error('Recording error:', err)
    }
  }, [])

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
    }
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }, [])

  const resetRecording = useCallback(() => {
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl)
    }
    setAudioBlob(null)
    setAudioUrl(null)
    setDuration(0)
    setRecordingState('idle')
    setEvaluation(null)
    setError(null)
    setLoadedSessionId(null)
  }, [audioUrl])

  const handleEvaluate = useCallback(async () => {
    if (!audioBlob) {
      setError('Aucun enregistrement à évaluer.')
      return
    }

    if (duration < 30) {
      setError('L\'enregistrement est trop court. Le monologue doit durer au moins 30 secondes.')
      return
    }

    setIsEvaluating(true)
    setError(null)

    try {
      // Convert blob to base64
      const reader = new FileReader()
      const audioBase64 = await new Promise<string>((resolve, reject) => {
        reader.onloadend = () => resolve(reader.result as string)
        reader.onerror = reject
        reader.readAsDataURL(audioBlob)
      })

      // Evaluate with LLM
      const result = await window.electronAPI.evaluateSpeaking(activity, audioBase64)
      setEvaluation(result)

      // Save session
      const sessionId = crypto.randomUUID()

      // Save audio file
      const audioPath = await window.electronAPI.saveAudioRecording(sessionId, activity.id, audioBase64)

      // Save session data
      const session: SpeakingSession = {
        id: sessionId,
        timestamp: new Date().toISOString(),
        part: 'part-d',
        exercise: exerciseId,
        activity: activityName,
        activityId: activity.id,
        audioPath,
        duration_seconds: duration,
        evaluation: result
      }
      await window.electronAPI.saveSpeakingSession(session)
      onSessionSaved?.()

      // Refresh history
      const sessions = await window.electronAPI.getSpeakingSessions(exerciseId, activityName)
      setPastSessions(sessions)
      setLoadedSessionId(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'L\'évaluation a échoué.')
    } finally {
      setIsEvaluating(false)
    }
  }, [audioBlob, duration, activity, exerciseId, activityName, onSessionSaved])

  const handleLoadSession = useCallback(async (session: SpeakingSession) => {
    try {
      // Load audio from file
      const audioData = await window.electronAPI.loadAudioRecording(session.audioPath)
      setAudioUrl(audioData)
      setDuration(session.duration_seconds)
      setEvaluation(session.evaluation)
      setLoadedSessionId(session.id)
      setRecordingState('recorded')
      setShowHistory(false)
      setError(null)
      setAudioBlob(null) // No blob for loaded sessions
    } catch (err) {
      setError('Impossible de charger l\'enregistrement audio.')
      console.error('Load audio error:', err)
    }
  }, [])

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const durationClass = useMemo(() => {
    if (duration < 30) return 'duration-short'
    if (duration >= 300 && duration <= 420) return 'duration-ideal' // 5-7 min
    if (duration > 420) return 'duration-long'
    return 'duration-ok'
  }, [duration])

  return (
    <div className="speaking-panel">
      {/* Topic Section */}
      <div className="speaking-prompt">
        <div className="prompt-header">
          <span className="prompt-type">Monologue suivi</span>
          <span className="prompt-requirement">{activity.duration}</span>
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
          <h3 className="topic-title">{activity.title}</h3>
          <p className="topic-content">{activity.content}</p>
          {activity.source && (
            <p className="topic-source">{activity.source}</p>
          )}
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
                  <span className="history-duration">{formatDurationShort(session.duration_seconds)}</span>
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
          Tentative précédente chargée - Cliquez "Nouvel enregistrement" pour essayer à nouveau
        </div>
      )}

      {/* Recording Section */}
      <div className="recording-panel">
        <div className="recording-controls">
          {recordingState === 'idle' && (
            <button onClick={startRecording} className="btn-record">
              <span className="record-icon">●</span> Enregistrer
            </button>
          )}

          {recordingState === 'recording' && (
            <>
              <button onClick={stopRecording} className="btn-stop">
                <span className="stop-icon">■</span> Arrêter
              </button>
              <span className="recording-indicator">
                <span className="pulse"></span> Enregistrement en cours...
              </span>
            </>
          )}

          {recordingState === 'recorded' && (
            <>
              <button onClick={resetRecording} className="btn-secondary">
                Nouvel enregistrement
              </button>
              {audioUrl && (
                <audio ref={audioRef} src={audioUrl} controls className="audio-playback" />
              )}
            </>
          )}
        </div>

        <div className={`duration-display ${durationClass}`}>
          <span className="duration-label">Durée:</span>
          <span className="duration-value">{formatDuration(duration)}</span>
          {recordingState === 'recording' && (
            <span className="duration-hint">
              {duration < 300 ? '(objectif: 5-7 min)' : duration <= 420 ? '✓ Durée idéale' : '(temps dépassé)'}
            </span>
          )}
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="speaking-error">
          {error}
        </div>
      )}

      {/* Action Buttons */}
      <div className="speaking-actions">
        <button
          onClick={() => setShowModelAnswer(!showModelAnswer)}
          className="btn-secondary"
        >
          {showModelAnswer ? 'Masquer la réponse modèle' : 'Voir réponse modèle'}
        </button>
        <button
          onClick={handleEvaluate}
          disabled={isEvaluating || recordingState !== 'recorded' || loadedSessionId !== null}
          className="btn-primary"
        >
          {isEvaluating ? 'Évaluation en cours...' : 'Soumettre pour évaluation'}
        </button>
      </div>

      {/* Model Answer */}
      {showModelAnswer && modelAnswer && (
        <div className="model-answer">
          <h4>Réponse modèle</h4>
          <div className="answer-section">
            <strong>Introduction:</strong>
            <p>{modelAnswer.introduction}</p>
          </div>
          {modelAnswer.development.map((para, i) => (
            <div key={i} className="answer-section">
              <strong>Développement {i + 1}:</strong>
              <p>{para}</p>
            </div>
          ))}
          <div className="answer-section">
            <strong>Conclusion:</strong>
            <p>{modelAnswer.conclusion}</p>
          </div>
        </div>
      )}

      {/* Evaluation Results */}
      {evaluation && (
        <SpeakingEvaluationPanel evaluation={evaluation} />
      )}

      {/* Note Editor */}
      <NoteEditor part="part-d" exercise={exerciseId} activity={activityName} />
    </div>
  )
}
