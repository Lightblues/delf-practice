import { useState, useMemo, useEffect } from 'react'
import { useExerciseData } from './hooks/useExerciseData'
import { useUserHistory } from './hooks/useUserHistory'
import { ExerciseSelector } from './components/ExerciseSelector'
import { PdfViewer } from './components/PdfViewer'
import { AnswerPanel } from './components/AnswerPanel'
import { StatusBar } from './components/StatusBar'
import { AudioPlayer } from './components/AudioPlayer'
import { TranscriptViewer } from './components/TranscriptViewer'
import { WritingPanel } from './components/WritingPanel'
import { SpeakingPanel } from './components/SpeakingPanel'
import { SettingsModal } from './components/SettingsModal'
import { NotesPage } from './components/NotesPage'
import type { Part, Answer, WritingIndex, WritingActivity, WritingAnswer, WritingAnswerData, SpeakingIndex, SpeakingActivity, SpeakingAnswer, SpeakingAnswerData } from '../shared/types'

export default function App() {
  const [selectedPart, setSelectedPart] = useState<Part>('part-a')
  const { index, answers, loading, error } = useExerciseData(selectedPart)
  const { saveSession, getActivityStats, getPartStats, getTotalCompleted, refresh: refreshHistory } = useUserHistory()

  const partStats = getPartStats(selectedPart)

  const [selectedExercise, setSelectedExercise] = useState('Exercice_I')
  const [selectedActivity, setSelectedActivity] = useState('Activite_1')

  // Part C specific state
  const [writingIndex, setWritingIndex] = useState<WritingIndex | null>(null)
  const [writingAnswers, setWritingAnswers] = useState<WritingAnswerData | null>(null)
  const [writingLoading, setWritingLoading] = useState(false)
  const [writingError, setWritingError] = useState<string | null>(null)

  // Part D specific state
  const [speakingIndex, setSpeakingIndex] = useState<SpeakingIndex | null>(null)
  const [speakingAnswers, setSpeakingAnswers] = useState<SpeakingAnswerData | null>(null)
  const [speakingLoading, setSpeakingLoading] = useState(false)
  const [speakingError, setSpeakingError] = useState<string | null>(null)

  // Settings modal
  const [showSettings, setShowSettings] = useState(false)

  // Notes page
  const [showNotes, setShowNotes] = useState(false)

  // Load writing index and answers when Part C is selected
  useEffect(() => {
    if (selectedPart === 'part-c') {
      setWritingLoading(true)
      setWritingError(null)
      Promise.all([
        window.electronAPI.loadWritingIndex(),
        window.electronAPI.loadWritingAnswers()
      ])
        .then(([idx, ans]) => {
          setWritingIndex(idx)
          setWritingAnswers(ans)
          // Set default exercise/activity for Part C
          const firstExercise = Object.keys(idx.exercises)[0]
          if (firstExercise) {
            setSelectedExercise(firstExercise)
            const firstActivity = idx.exercises[firstExercise].activities[0]
            if (firstActivity) {
              setSelectedActivity(`Activite_${firstActivity.id}`)
            }
          }
        })
        .catch(err => setWritingError(err.message))
        .finally(() => setWritingLoading(false))
    }
  }, [selectedPart])

  // Load speaking index and answers when Part D is selected
  useEffect(() => {
    if (selectedPart === 'part-d') {
      setSpeakingLoading(true)
      setSpeakingError(null)
      Promise.all([
        window.electronAPI.loadSpeakingIndex(),
        window.electronAPI.loadSpeakingAnswers()
      ])
        .then(([idx, ans]) => {
          setSpeakingIndex(idx)
          setSpeakingAnswers(ans)
          // Set default exercise/activity for Part D
          const firstExercise = Object.keys(idx.exercises)[0]
          if (firstExercise) {
            setSelectedExercise(firstExercise)
            const firstActivity = idx.exercises[firstExercise].activities[0]
            if (firstActivity) {
              setSelectedActivity(`Activite_${firstActivity.id}`)
            }
          }
        })
        .catch(err => setSpeakingError(err.message))
        .finally(() => setSpeakingLoading(false))
    }
  }, [selectedPart])

  // Get current activity data for Part A/B
  const currentActivity = useMemo(() => {
    if (selectedPart === 'part-c' || selectedPart === 'part-d' || !index) return null
    return index.exercises[selectedExercise]?.activities.find(
      a => a.name === selectedActivity
    ) ?? null
  }, [index, selectedExercise, selectedActivity, selectedPart])

  // Get current writing activity for Part C
  const currentWritingActivity = useMemo((): WritingActivity | null => {
    if (selectedPart !== 'part-c' || !writingIndex) return null
    const activityId = parseInt(selectedActivity.replace('Activite_', ''))
    return writingIndex.exercises[selectedExercise]?.activities.find(
      a => a.id === activityId
    ) ?? null
  }, [writingIndex, selectedExercise, selectedActivity, selectedPart])

  // Get current speaking activity for Part D
  const currentSpeakingActivity = useMemo((): SpeakingActivity | null => {
    if (selectedPart !== 'part-d' || !speakingIndex) return null
    const activityId = parseInt(selectedActivity.replace('Activite_', ''))
    return speakingIndex.exercises[selectedExercise]?.activities.find(
      a => a.id === activityId
    ) ?? null
  }, [speakingIndex, selectedExercise, selectedActivity, selectedPart])

  // Get model answer for current writing activity
  const currentWritingModelAnswer = useMemo((): WritingAnswer | null => {
    if (selectedPart !== 'part-c' || !writingAnswers) return null
    return writingAnswers.Production_ecrite?.[selectedExercise]?.[selectedActivity] ?? null
  }, [writingAnswers, selectedExercise, selectedActivity, selectedPart])

  // Get model answer for current speaking activity
  const currentSpeakingModelAnswer = useMemo((): SpeakingAnswer | null => {
    if (selectedPart !== 'part-d' || !speakingAnswers) return null
    return speakingAnswers.Production_orale?.[selectedExercise]?.[selectedActivity] ?? null
  }, [speakingAnswers, selectedExercise, selectedActivity, selectedPart])

  // Get correct answers for current activity (Part A/B)
  const correctAnswers = useMemo(() => {
    if (selectedPart === 'part-c' || selectedPart === 'part-d' || !answers) return []
    const section = selectedPart === 'part-a'
      ? answers.Comprehension_orale
      : answers.Comprehension_des_ecrits
    return section?.[selectedExercise]?.[selectedActivity] ?? []
  }, [answers, selectedPart, selectedExercise, selectedActivity])

  // Total activities count
  const totalActivities = useMemo(() => {
    if (selectedPart === 'part-d') {
      if (!speakingIndex) return 0
      return Object.values(speakingIndex.exercises).reduce(
        (sum, ex) => sum + ex.num_activities,
        0
      )
    }
    if (selectedPart === 'part-c') {
      if (!writingIndex) return 0
      return Object.values(writingIndex.exercises).reduce(
        (sum, ex) => sum + ex.num_activities,
        0
      )
    }
    if (!index) return 0
    return Object.values(index.exercises).reduce(
      (sum, ex) => sum + ex.num_activities,
      0
    )
  }, [index, writingIndex, speakingIndex, selectedPart])

  const handlePartChange = (part: Part) => {
    setSelectedPart(part)
    if (part === 'part-d') {
      // Part D uses different exercise keys
      setSelectedExercise('monologue_suivi')
      setSelectedActivity('Activite_4')
    } else if (part === 'part-c') {
      // Part C uses different exercise keys
      setSelectedExercise('formal_letter')
      setSelectedActivity('Activite_4')
    } else {
      setSelectedExercise('Exercice_I')
      setSelectedActivity('Activite_1')
    }
  }

  const handleExerciseChange = (exercise: string) => {
    setSelectedExercise(exercise)
    if (selectedPart === 'part-d' && speakingIndex) {
      const firstActivity = speakingIndex.exercises[exercise]?.activities[0]
      if (firstActivity) {
        setSelectedActivity(`Activite_${firstActivity.id}`)
      }
    } else if (selectedPart === 'part-c' && writingIndex) {
      const firstActivity = writingIndex.exercises[exercise]?.activities[0]
      if (firstActivity) {
        setSelectedActivity(`Activite_${firstActivity.id}`)
      }
    } else {
      setSelectedActivity('Activite_1')
    }
  }

  const handleSubmit = async (userAnswers: (Answer | null)[]) => {
    await saveSession(selectedPart, selectedExercise, selectedActivity, userAnswers, correctAnswers)
  }

  const handleNavigateFromNotes = (part: Part, exercise: string, activity: string) => {
    setSelectedPart(part)
    setSelectedExercise(exercise)
    setSelectedActivity(activity)
    setShowNotes(false)
  }

  const isListening = selectedPart === 'part-a'
  const isWriting = selectedPart === 'part-c'
  const isSpeaking = selectedPart === 'part-d'

  // Loading state
  const isLoading = isSpeaking ? speakingLoading : isWriting ? writingLoading : loading
  const currentError = isSpeaking ? speakingError : isWriting ? writingError : error

  if (isLoading) {
    return (
      <div className="app">
        <div className="pdf-panel">
          <div className="pdf-loading">Loading exercise data...</div>
        </div>
      </div>
    )
  }

  const hasRequiredData = isSpeaking
    ? !!speakingIndex
    : isWriting
      ? !!writingIndex
      : !!(index && answers)

  if (currentError || !hasRequiredData) {
    return (
      <div className="app">
        <div className="pdf-panel">
          <div className="pdf-loading" style={{ color: 'var(--error)' }}>
            {currentError || 'Failed to load data'}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="app">
      <header className="header">
        <h1>DELF B2 Practice</h1>
        <ExerciseSelector
          part={selectedPart}
          index={(isWriting || isSpeaking) ? null : index}
          writingIndex={isWriting ? writingIndex : null}
          speakingIndex={isSpeaking ? speakingIndex : null}
          selectedExercise={selectedExercise}
          selectedActivity={selectedActivity}
          partStats={partStats}
          onPartChange={handlePartChange}
          onExerciseChange={handleExerciseChange}
          onActivityChange={setSelectedActivity}
        />
        <button className="notes-btn" onClick={() => setShowNotes(true)} title="Mes Notes">
          📝
        </button>
        <button className="settings-btn" onClick={() => setShowSettings(true)} title="Settings">
          ⚙
        </button>
      </header>

      <main className="main-content">
        {isSpeaking ? (
          <div className="speaking-container">
            {currentSpeakingActivity && (
              <SpeakingPanel
                key={`${selectedExercise}-${selectedActivity}`}
                activity={currentSpeakingActivity}
                exerciseId={selectedExercise}
                activityName={selectedActivity}
                modelAnswer={currentSpeakingModelAnswer}
                onSessionSaved={refreshHistory}
              />
            )}
          </div>
        ) : isWriting ? (
          <div className="writing-container">
            {currentWritingActivity && (
              <WritingPanel
                key={`${selectedExercise}-${selectedActivity}`}
                activity={currentWritingActivity}
                exerciseId={selectedExercise}
                activityName={selectedActivity}
                modelAnswer={currentWritingModelAnswer}
                onSessionSaved={refreshHistory}
              />
            )}
          </div>
        ) : (
          <>
            <div className={`left-panel ${isListening ? 'listening-mode' : ''}`}>
              <PdfViewer part={selectedPart} pdfPath={currentActivity?.file ?? null} />
              {isListening && (
                <>
                  <AudioPlayer part={selectedPart} audioPath={currentActivity?.audio ?? null} />
                  <TranscriptViewer part={selectedPart} transcriptPath={currentActivity?.transcript ?? null} />
                </>
              )}
            </div>
            <AnswerPanel
              part={selectedPart}
              exercise={selectedExercise}
              activity={selectedActivity}
              questionCount={correctAnswers.length}
              correctAnswers={correctAnswers}
              onSubmit={handleSubmit}
            />
          </>
        )}
      </main>

      <StatusBar
        part={selectedPart}
        totalActivities={totalActivities}
        completedCount={getTotalCompleted(selectedPart)}
        currentStats={getActivityStats(selectedPart, selectedExercise, selectedActivity)}
        isWriting={isWriting}
        isSpeaking={isSpeaking}
      />

      {showSettings && (
        <SettingsModal onClose={() => setShowSettings(false)} />
      )}

      {showNotes && (
        <NotesPage onClose={() => setShowNotes(false)} onNavigate={handleNavigateFromNotes} />
      )}
    </div>
  )
}
