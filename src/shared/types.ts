// Exercise data types
export type Part = 'part-a' | 'part-b' | 'part-c' | 'part-d'

export interface Activity {
  name: string
  file: string
  pages: number[]
  audio?: string      // Part A only
  transcript?: string // Part A only
}

export interface Exercise {
  num_activities: number
  pages_per_activity?: number // Part B only
  activities: Activity[]
}

export interface ExerciseIndex {
  section: string
  exercises: Record<string, Exercise>
}

export type Answer = 'A' | 'B' | 'C'

// Part A uses Comprehension_orale, Part B uses Comprehension_des_ecrits
export interface AnswerData {
  Comprehension_des_ecrits?: Record<string, Record<string, Answer[]>>
  Comprehension_orale?: Record<string, Record<string, Answer[]>>
}

// User history types
export interface Session {
  id: string
  timestamp: string
  part: Part
  exercise: string
  activity: string
  answers: (Answer | null)[]
  correct: number
  total: number
}

export interface ActivityStats {
  attempts: number
  bestScore: number
  lastAttempt: string
}

// Stats are organized by part -> exercise -> activity
export type PartStats = Record<string, Record<string, ActivityStats>>

export interface UserHistory {
  sessions: Session[]
  stats: Record<Part, PartStats>  // { 'part-a': {...}, 'part-b': {...}, 'part-c': {...} }
}

// ============= Part C (Writing) Types =============

export type WritingExerciseType = 'formal_letter' | 'reader_response' | 'article'

export interface WritingActivity {
  id: number
  type: WritingExerciseType
  context?: string    // Background situation
  stimulus?: string   // For forum responses - message to respond to
  topic?: string      // For articles - main topic
  task: string        // What user must write
  requirements: string // "250 mots minimum"
}

export interface WritingExercise {
  title: string
  num_activities: number
  activities: WritingActivity[]
}

export interface WritingIndex {
  section: 'Production_ecrite'
  exercises: Record<string, WritingExercise>
}

export interface WritingAnswer {
  content: string  // Full model answer text
}

export interface WritingAnswerData {
  Production_ecrite: Record<string, Record<string, WritingAnswer>>
}

export interface ScoreDetail {
  score: number
  feedback: string
}

export interface EvaluationResponse {
  scores: {
    task_completion: ScoreDetail
    coherence_cohesion: ScoreDetail
    sociolinguistic: ScoreDetail
    lexique: ScoreDetail
    morphosyntax: ScoreDetail
  }
  total: number
  wordCount: number
  overallFeedback: string
  strengths: string[]
  improvements: string[]
}

export interface WritingSession {
  id: string
  timestamp: string
  part: 'part-c'
  exercise: string
  activity: string
  activityId: number
  userText: string
  wordCount: number
  evaluation: EvaluationResponse
}

export interface AppConfig {
  openrouter_api_key?: string
  openrouter_model?: string  // Part C (Writing) - default: "anthropic/claude-sonnet-4.5"
  openrouter_voice_model?: string  // Part D (Speaking) - default: "google/gemini-3-flash-preview"
  custom_text_models?: string[]  // User-added models for Part C
  custom_voice_models?: string[]  // User-added models for Part D
}

// ============= Part D (Speaking) Types =============

export interface SpeakingActivity {
  id: number
  title: string
  content: string
  source?: string | null
  duration: string  // "5 à 7 minutes"
}

export interface SpeakingExercise {
  title: string
  num_activities: number
  activities: SpeakingActivity[]
}

export interface SpeakingIndex {
  section: 'Production_orale'
  exercises: Record<string, SpeakingExercise>
}

export interface SpeakingAnswer {
  introduction: string
  development: string[]
  conclusion: string
}

export interface SpeakingAnswerData {
  Production_orale: Record<string, Record<string, SpeakingAnswer>>
}

export interface SpeakingScoreDetail {
  score: number  // 0-5
  feedback: string
}

export interface SpeakingEvaluationResponse {
  scores: {
    monologue_suivi: SpeakingScoreDetail
    interaction: SpeakingScoreDetail
    lexique: SpeakingScoreDetail
    morphosyntax: SpeakingScoreDetail
    phonologie: SpeakingScoreDetail
  }
  total: number  // 0-25
  duration_seconds: number
  transcription: string
  overallFeedback: string
  strengths: string[]
  improvements: string[]
}

export interface SpeakingSession {
  id: string
  timestamp: string
  part: 'part-d'
  exercise: string
  activity: string
  activityId: number
  audioPath: string
  duration_seconds: number
  evaluation: SpeakingEvaluationResponse
}

// ============= Notes Types =============

export interface Note {
  id: string              // UUID
  part: Part
  exercise: string        // "Exercice_I" | "formal_letter" | "monologue_suivi"
  activity: string        // "Activite_1"
  content: string         // Note content (plain text)
  createdAt: string       // ISO 8601
  updatedAt: string       // ISO 8601
}

export interface NotesData {
  notes: Note[]
}

// IPC API types
export interface ElectronAPI {
  // Part A/B
  loadIndex(part: Part): Promise<ExerciseIndex>
  loadAnswers(part: Part): Promise<AnswerData>
  loadPdf(part: Part, path: string): Promise<ArrayBuffer>
  loadAudio(part: Part, path: string): Promise<string> // Returns data URL
  loadHistory(): Promise<UserHistory>
  saveSession(session: Session): Promise<void>
  getDataPath(part: Part): Promise<string>
  // Part C
  loadWritingIndex(): Promise<WritingIndex>
  loadWritingAnswers(): Promise<WritingAnswerData>
  evaluateWriting(activity: WritingActivity, userText: string): Promise<EvaluationResponse>
  saveWritingSession(session: WritingSession): Promise<void>
  getWritingSessions(exercise: string, activity: string): Promise<WritingSession[]>
  // Part D
  loadSpeakingIndex(): Promise<SpeakingIndex>
  loadSpeakingAnswers(): Promise<SpeakingAnswerData>
  saveAudioRecording(sessionId: string, activityId: number, audioBase64: string): Promise<string>
  loadAudioRecording(audioPath: string): Promise<string>
  evaluateSpeaking(activity: SpeakingActivity, audioBase64: string): Promise<SpeakingEvaluationResponse>
  saveSpeakingSession(session: SpeakingSession): Promise<void>
  getSpeakingSessions(exercise: string, activity: string): Promise<SpeakingSession[]>
  // Config
  getConfig(): Promise<AppConfig>
  setConfig(config: Partial<AppConfig>): Promise<void>
  // Notes
  loadNote(part: Part, exercise: string, activity: string): Promise<Note | null>
  saveNote(part: Part, exercise: string, activity: string, content: string): Promise<Note>
  deleteNote(noteId: string): Promise<void>
  loadAllNotes(): Promise<Note[]>
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}
