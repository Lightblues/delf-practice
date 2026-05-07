# DELF Practice App Specification

## Overview

macOS desktop app for DELF B2 exam practice with 4 sections: Listening, Reading, Writing, Speaking.

**Tech Stack**: Electron + React + Vite + electron-vite

## Project Structure

```
packages/delf/
├── src/
│   ├── main/index.ts          # Electron main process + IPC handlers
│   ├── preload/index.ts       # Context bridge
│   ├── shared/types.ts        # Shared TypeScript types
│   └── renderer/
│       ├── App.tsx
│       ├── components/
│       │   ├── ExerciseSelector.tsx
│       │   ├── PdfViewer.tsx
│       │   ├── AnswerPanel.tsx        # Part A/B
│       │   ├── AudioPlayer.tsx        # Part A
│       │   ├── TranscriptViewer.tsx   # Part A
│       │   ├── WritingPanel.tsx       # Part C
│       │   ├── EvaluationPanel.tsx    # Part C
│       │   ├── SpeakingPanel.tsx      # Part D
│       │   ├── SpeakingEvaluationPanel.tsx
│       │   ├── StatusBar.tsx
│       │   └── SettingsModal.tsx
│       └── hooks/
│           ├── useExerciseData.ts
│           └── useUserHistory.ts
└── resources/data/            # Bundled data (index.json, answer.json per part)
    ├── part-a/                # + PDF/MP3 files (via GitHub release)
    ├── part-b/                # + PDF files (via GitHub release)
    ├── part-c/
    └── part-d/
```

---

## Data Structure

### Part A: Listening (Compréhension de l'oral)

| File | Content |
|------|---------|
| `index.json` | Exercise metadata with audio/transcript references |
| `answer.json` | Correct answers (A/B/C arrays) |
| `Exercice_I/` | 16 activities × 7 questions |
| `Exercice_II/` | 14 activities × 7 questions |
| `Exercice_III/` | 16 activities × 6 questions |
| `Audio/` | MP3 files |
| `Transcripts/` | PDF transcripts |

```typescript
// index.json
interface ListeningIndex {
  section: "Comprehension_orale"
  exercises: Record<string, {
    num_activities: number
    activities: {
      name: string        // "Activite_1"
      file: string        // PDF path
      pages: number[]
      audio: string       // MP3 path
      transcript: string  // Transcript PDF path
    }[]
  }>
}

// answer.json
interface ListeningAnswers {
  Comprehension_orale: Record<string, Record<string, ("A"|"B"|"C")[]>>
}
```

### Part B: Reading (Compréhension des écrits)

| File | Content |
|------|---------|
| `index.json` | Exercise metadata |
| `answer.json` | Correct answers |
| `Exercice_I/II/III/` | Same structure as Part A (PDF only) |

```typescript
// Same structure as Part A, without audio/transcript fields
interface ReadingIndex {
  section: "Comprehension_des_ecrits"
  exercises: Record<string, {
    num_activities: number
    pages_per_activity: number
    activities: { name: string; file: string; pages: number[] }[]
  }>
}
```

### Part C: Writing (Production écrite)

| File | Content |
|------|---------|
| `index.json` | Writing prompts by type |
| `answer.json` | Model answers |

**Exercise Types**: `formal_letter` (15), `reader_response` (15), `article` (15) = 45 total

```typescript
// index.json
interface WritingIndex {
  section: "Production_ecrite"
  exercises: Record<string, {
    title: string
    num_activities: number
    activities: {
      id: number           // Activity ID (4-48)
      type: "formal_letter" | "reader_response" | "article"
      context?: string     // Background situation
      stimulus?: string    // For forum responses
      topic?: string       // For articles
      task: string         // What to write
      requirements: string // "250 mots minimum"
    }[]
  }>
}

// answer.json
interface WritingAnswerData {
  Production_ecrite: Record<string, Record<string, {
    content: string  // Full model answer text
  }>>
}
```

### Part D: Speaking (Production orale)

| File | Content |
|------|---------|
| `index.json` | Speaking topics |
| `answer.json` | Model answers (structured) |

**Exercise Type**: `monologue_suivi` (45 activities)

```typescript
// index.json
interface SpeakingIndex {
  section: "Production_orale"
  exercises: Record<string, {
    title: string
    num_activities: number
    activities: {
      id: number
      title: string      // Topic title
      content: string    // Full topic text
      source?: string    // Attribution
      duration: string   // "5 à 7 minutes"
    }[]
  }>
}

// answer.json
interface SpeakingAnswerData {
  Production_orale: Record<string, Record<string, {
    introduction: string
    development: string[]
    conclusion: string
  }>>
}
```

---

## User Data

**Location**: `~/.ea/delf/`

```
~/.ea/delf/
├── user/
│   ├── history.json           # All sessions + stats
│   ├── notes.json             # User notes
│   └── audio/part-d/          # Recorded audio files
└── config.json                # API key + model settings
```

### history.json

```typescript
type Part = "part-a" | "part-b" | "part-c" | "part-d"

interface UserHistory {
  sessions: (Session | WritingSession | SpeakingSession)[]
  stats: Record<Part, Record<string, Record<string, {
    attempts: number
    bestScore: number   // 0-100
    lastAttempt: string // ISO 8601
  }>>>
}

// Part A/B session
interface Session {
  id: string; timestamp: string; part: Part
  exercise: string; activity: string
  answers: string[]; correct: number; total: number
}

// Part C session
interface WritingSession {
  id: string; timestamp: string; part: "part-c"
  exercise: string; activity: string; activityId: number
  userText: string; wordCount: number
  evaluation: EvaluationResponse
}

// Part D session
interface SpeakingSession {
  id: string; timestamp: string; part: "part-d"
  exercise: string; activity: string; activityId: number
  audioPath: string; duration_seconds: number
  evaluation: SpeakingEvaluationResponse
}
```

### notes.json

```typescript
interface Note {
  id: string              // UUID
  part: Part              // "part-a" | "part-b" | "part-c" | "part-d"
  exercise: string        // "Exercice_I" | "formal_letter" | "monologue_suivi"
  activity: string        // "Activite_1"
  content: string         // Plain text note
  createdAt: string       // ISO 8601
  updatedAt: string       // ISO 8601
}

interface NotesData {
  notes: Note[]
}
```

### config.json

```typescript
interface AppConfig {
  openrouter_api_key?: string
  openrouter_model?: string        // Part C, default: "anthropic/claude-sonnet-4.5"
  openrouter_voice_model?: string  // Part D, default: "google/gemini-3-flash-preview"
  custom_text_models?: string[]
  custom_voice_models?: string[]
}
```

---

## IPC API

```typescript
interface ElectronAPI {
  // Part A/B
  loadIndex(part: Part): Promise<ExerciseIndex>
  loadAnswers(part: Part): Promise<AnswerData>
  loadPdf(part: Part, path: string): Promise<ArrayBuffer>
  loadAudio(part: Part, path: string): Promise<string>  // data URL

  // Part C
  loadWritingIndex(): Promise<WritingIndex>
  loadWritingAnswers(): Promise<WritingAnswerData>
  evaluateWriting(activity, userText): Promise<EvaluationResponse>
  saveWritingSession(session): Promise<void>
  getWritingSessions(exercise, activity): Promise<WritingSession[]>

  // Part D
  loadSpeakingIndex(): Promise<SpeakingIndex>
  loadSpeakingAnswers(): Promise<SpeakingAnswerData>
  saveAudioRecording(sessionId, activityId, audioBase64): Promise<string>
  loadAudioRecording(audioPath): Promise<string>
  evaluateSpeaking(activity, audioBase64): Promise<SpeakingEvaluationResponse>
  saveSpeakingSession(session): Promise<void>
  getSpeakingSessions(exercise, activity): Promise<SpeakingSession[]>

  // Common
  loadHistory(): Promise<UserHistory>
  saveSession(session): Promise<void>
  getConfig(): Promise<AppConfig>
  setConfig(config): Promise<void>
  // Notes
  loadNote(part, exercise, activity): Promise<Note | null>
  saveNote(part, exercise, activity, content): Promise<Note>
  deleteNote(noteId): Promise<void>
  loadAllNotes(): Promise<Note[]>
}
```

---

## UI Overview

### Part A/B Layout

```
┌──────────────────────────────────────────────────────────────┐
│  [Part A/B ▼]  Exercise: [▼]  Activity: [▼]           [⚙]   │
├────────────────────────────────────┬─────────────────────────┤
│                                    │  Q1: ○A ○B ○C          │
│         PDF Viewer (80%)           │  Q2: ○A ○B ○C          │
│                                    │  ...                    │
├────────────────────────────────────│  [Submit]               │
│  ▶ Audio Player (Part A only)      │                         │
│  📄 Transcript (collapsible)       │                         │
├────────────────────────────────────┴─────────────────────────┤
│  Status: X/46 completed | Best: XX%                          │
└──────────────────────────────────────────────────────────────┘
```

### Part C Layout

```
┌──────────────────────────────────────────────────────────────┐
│  [Part C ▼]  Exercise: [▼]  Activity: [▼]  [📋 History]     │
├──────────────────────────────────────────────────────────────┤
│  CONTEXTE: ...  |  TÂCHE: ...  |  250 mots minimum           │
├──────────────────────────────────────────────────────────────┤
│  ┌────────────────────────────────────────────────────────┐  │
│  │              Writing Textarea                          │  │
│  └────────────────────────────────────────────────────────┘  │
│                                              Mots: XX / 250  │
├──────────────────────────────────────────────────────────────┤
│  [Voir réponse modèle] [Effacer] [Soumettre pour évaluation] │
├──────────────────────────────────────────────────────────────┤
│  (Model Answer - collapsible)                                │
├──────────────────────────────────────────────────────────────┤
│  (Evaluation Panel - after submission)                       │
│  Score: XX/25 | Detailed feedback by criterion               │
└──────────────────────────────────────────────────────────────┘
```

### Part D Layout

```
┌──────────────────────────────────────────────────────────────┐
│  [Part D ▼]  Exercise: [▼]  Activity: [▼]  [📋 History]     │
├──────────────────────────────────────────────────────────────┤
│  Topic Title                                                 │
│  Topic content text...                                       │
│  Source: ...                         Duration: 5-7 minutes   │
├──────────────────────────────────────────────────────────────┤
│  [● Record] [⏹ Stop] [▶ Play]              Duration: 00:00  │
├──────────────────────────────────────────────────────────────┤
│  [Voir réponse modèle]            [Soumettre pour évaluation]│
├──────────────────────────────────────────────────────────────┤
│  (Model Answer / Evaluation Panel - collapsible)             │
└──────────────────────────────────────────────────────────────┘
```

### Progress Indicators

**Activity Dropdown**: ` ` (not attempted) | `○` (attempted) | `✓` (perfect)

**Exercise Dropdown**: `Exercice I (2✓ 3○ / 16)`

---

## LLM Evaluation

**Provider**: OpenRouter API (`https://openrouter.ai/api/v1/chat/completions`)

### Part C: Writing (25 points)

| Criterion | Points | Description |
|-----------|--------|-------------|
| task_completion | 0-5 | Réalisation de la tâche |
| coherence_cohesion | 0-5 | Cohérence et cohésion |
| sociolinguistic | 0-5 | Adéquation sociolinguistique |
| lexique | 0-5 | Vocabulaire |
| morphosyntax | 0-5 | Grammaire |

```typescript
interface EvaluationResponse {
  scores: Record<string, { score: number; feedback: string }>
  total: number  // 0-25
  wordCount: number
  overallFeedback: string
  strengths: string[]
  improvements: string[]
}
```

### Part D: Speaking (25 points)

| Criterion | Points | Description |
|-----------|--------|-------------|
| monologue_suivi | 0-5 | Argumentation |
| interaction | 0-5 | Anticipation des contre-arguments |
| lexique | 0-5 | Vocabulaire |
| morphosyntax | 0-5 | Grammaire |
| phonologie | 0-5 | Prononciation |

```typescript
interface SpeakingEvaluationResponse {
  scores: Record<string, { score: number; feedback: string }>
  total: number  // 0-25
  duration_seconds: number
  transcription: string  // Auto-transcribed
  overallFeedback: string
  strengths: string[]
  improvements: string[]
}
```

**Audio Format**: WebM (Opus), Base64 encoded

---

## Features

### Notes System

**Components**:
- **NoteEditor**: Collapsible note editor in each activity panel (auto-save with 1s debounce)
- **NotesPage**: Summary page with filtering (by part), sorting (by date), and navigation

**Storage**: `~/.ea/delf/user/notes.json`

**UI**:
- Header button (📝) to open NotesPage
- NoteEditor at bottom of each panel (all parts)
- Click note card to navigate to activity
- Delete confirmation for note removal

---

## Implementation Status

| Phase | Feature | Status |
|-------|---------|--------|
| 1 | Reading Comprehension (Part B) | ✓ |
| 2 | Listening Comprehension (Part A) | ✓ |
| 3 | Writing Production (Part C) | ✓ |
| 3.x | Part C Model Answers | ✓ |
| 4 | Speaking Production (Part D) | ✓ |
| 4.x | Notes System (All Parts) | ✓ |
| 5 | Mock Exam Mode | - |
