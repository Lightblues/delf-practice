import { app, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { readFile, writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import { homedir } from 'os'
import type { Part, Session, UserHistory, WritingIndex, WritingAnswerData, WritingActivity, EvaluationResponse, WritingSession, AppConfig, SpeakingIndex, SpeakingAnswerData, SpeakingActivity, SpeakingEvaluationResponse, SpeakingSession, Note, NotesData } from '../shared/types'

let mainWindow: BrowserWindow | null = null

function getDataPath(part: Part): string {
  // In dev mode, use the project's .ea/delf/data/extracted/{part}
  if (process.env.NODE_ENV === 'development' || !app.isPackaged) {
    return join(__dirname, '../../resources/data', part)
  }
  // In production, use the bundled resources
  return join(process.resourcesPath, 'data', part)
}

function getUserDataPath(): string {
  return join(homedir(), '.ea', 'delf', 'user')
}

function getConfigPath(): string {
  return join(homedir(), '.ea', 'delf', 'config.json')
}

async function ensureUserDataDir(): Promise<void> {
  const userDir = getUserDataPath()
  if (!existsSync(userDir)) {
    await mkdir(userDir, { recursive: true })
  }
}

async function ensureConfigDir(): Promise<void> {
  const configDir = join(homedir(), '.ea', 'delf')
  if (!existsSync(configDir)) {
    await mkdir(configDir, { recursive: true })
  }
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 700,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false
    },
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 15, y: 15 }
  })

  if (process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL)
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// IPC Handlers
ipcMain.handle('load-index', async (_, part: Part) => {
  const indexPath = join(getDataPath(part), 'index.json')
  const data = await readFile(indexPath, 'utf-8')
  return JSON.parse(data)
})

ipcMain.handle('load-answers', async (_, part: Part) => {
  const answersPath = join(getDataPath(part), 'answer.json')
  const data = await readFile(answersPath, 'utf-8')
  return JSON.parse(data)
})

ipcMain.handle('load-pdf', async (_, part: Part, relativePath: string) => {
  const pdfPath = join(getDataPath(part), relativePath)
  const buffer = await readFile(pdfPath)
  return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength)
})

ipcMain.handle('load-audio', async (_, part: Part, relativePath: string) => {
  const audioPath = join(getDataPath(part), relativePath)
  const buffer = await readFile(audioPath)
  const base64 = buffer.toString('base64')
  return `data:audio/mpeg;base64,${base64}`
})

ipcMain.handle('load-history', async () => {
  await ensureUserDataDir()
  const historyPath = join(getUserDataPath(), 'history.json')

  const emptyHistory: UserHistory = {
    sessions: [],
    stats: { 'part-a': {}, 'part-b': {}, 'part-c': {}, 'part-d': {} }
  }

  if (!existsSync(historyPath)) {
    return emptyHistory
  }

  const data = await readFile(historyPath, 'utf-8')
  const history = JSON.parse(data) as UserHistory

  // Migration: ensure stats has all part keys
  if (!history.stats['part-a']) history.stats['part-a'] = {}
  if (!history.stats['part-b']) history.stats['part-b'] = {}
  if (!history.stats['part-c']) history.stats['part-c'] = {}
  if (!history.stats['part-d']) history.stats['part-d'] = {}

  return history
})

ipcMain.handle('save-session', async (_, session: Session) => {
  await ensureUserDataDir()
  const historyPath = join(getUserDataPath(), 'history.json')

  let history: UserHistory = {
    sessions: [],
    stats: { 'part-a': {}, 'part-b': {}, 'part-c': {}, 'part-d': {} }
  }
  if (existsSync(historyPath)) {
    const data = await readFile(historyPath, 'utf-8')
    history = JSON.parse(data)
    // Migration: ensure stats has all part keys
    if (!history.stats['part-a']) history.stats['part-a'] = {}
    if (!history.stats['part-b']) history.stats['part-b'] = {}
    if (!history.stats['part-c']) history.stats['part-c'] = {}
    if (!history.stats['part-d']) history.stats['part-d'] = {}
  }

  // Add session
  history.sessions.push(session)

  // Update stats by part
  const { part, exercise, activity, correct, total } = session
  if (!history.stats[part][exercise]) {
    history.stats[part][exercise] = {}
  }
  const score = Math.round((correct / total) * 100)
  const existing = history.stats[part][exercise][activity]
  history.stats[part][exercise][activity] = {
    attempts: (existing?.attempts || 0) + 1,
    bestScore: Math.max(existing?.bestScore || 0, score),
    lastAttempt: session.timestamp
  }

  await writeFile(historyPath, JSON.stringify(history, null, 2))
})

ipcMain.handle('get-data-path', (_, part: Part) => getDataPath(part))

// ============= Part C (Writing) IPC Handlers =============

ipcMain.handle('load-writing-index', async (): Promise<WritingIndex> => {
  const indexPath = join(getDataPath('part-c'), 'index.json')
  const data = await readFile(indexPath, 'utf-8')
  return JSON.parse(data)
})

ipcMain.handle('load-writing-answers', async (): Promise<WritingAnswerData> => {
  const answersPath = join(getDataPath('part-c'), 'answer.json')
  const data = await readFile(answersPath, 'utf-8')
  return JSON.parse(data)
})

ipcMain.handle('evaluate-writing', async (_, activity: WritingActivity, userText: string): Promise<EvaluationResponse> => {
  const config = await loadConfig()
  if (!config.openrouter_api_key) {
    throw new Error('OpenRouter API key not configured. Please set it in Settings.')
  }

  const model = config.openrouter_model || 'anthropic/claude-sonnet-4.5'
  const response = await callOpenRouter(config.openrouter_api_key, model, activity, userText)
  return response
})

ipcMain.handle('save-writing-session', async (_, session: WritingSession) => {
  await ensureUserDataDir()
  const historyPath = join(getUserDataPath(), 'history.json')

  let history: UserHistory = {
    sessions: [],
    stats: { 'part-a': {}, 'part-b': {}, 'part-c': {}, 'part-d': {} }
  }
  if (existsSync(historyPath)) {
    const data = await readFile(historyPath, 'utf-8')
    history = JSON.parse(data)
    if (!history.stats['part-c']) history.stats['part-c'] = {}
  }

  // Add writing session to sessions array
  history.sessions.push(session as unknown as Session)

  // Update stats for Part C (score out of 25 -> percentage)
  const { exercise, activity, evaluation } = session
  if (!history.stats['part-c'][exercise]) {
    history.stats['part-c'][exercise] = {}
  }
  const score = Math.round((evaluation.total / 25) * 100)
  const existing = history.stats['part-c'][exercise][activity]
  history.stats['part-c'][exercise][activity] = {
    attempts: (existing?.attempts || 0) + 1,
    bestScore: Math.max(existing?.bestScore || 0, score),
    lastAttempt: session.timestamp
  }

  await writeFile(historyPath, JSON.stringify(history, null, 2))
})

// Get writing sessions for a specific activity
ipcMain.handle('get-writing-sessions', async (_, exercise: string, activity: string): Promise<WritingSession[]> => {
  await ensureUserDataDir()
  const historyPath = join(getUserDataPath(), 'history.json')

  if (!existsSync(historyPath)) return []

  const data = await readFile(historyPath, 'utf-8')
  const history = JSON.parse(data) as UserHistory

  // Filter sessions for part-c with matching exercise/activity
  const sessions = history.sessions.filter(s =>
    s.part === 'part-c' &&
    (s as unknown as WritingSession).exercise === exercise &&
    (s as unknown as WritingSession).activity === activity
  ) as unknown as WritingSession[]

  // Sort by timestamp descending (newest first)
  return sessions.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
})

// Get speaking sessions for a specific activity
ipcMain.handle('get-speaking-sessions', async (_, exercise: string, activity: string): Promise<SpeakingSession[]> => {
  await ensureUserDataDir()
  const historyPath = join(getUserDataPath(), 'history.json')

  if (!existsSync(historyPath)) return []

  const data = await readFile(historyPath, 'utf-8')
  const history = JSON.parse(data) as UserHistory

  // Filter sessions for part-d with matching exercise/activity
  const sessions = history.sessions.filter(s =>
    s.part === 'part-d' &&
    (s as unknown as SpeakingSession).exercise === exercise &&
    (s as unknown as SpeakingSession).activity === activity
  ) as unknown as SpeakingSession[]

  // Sort by timestamp descending (newest first)
  return sessions.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
})

// ============= Config IPC Handlers =============

async function loadConfig(): Promise<AppConfig> {
  await ensureConfigDir()
  const configPath = getConfigPath()
  if (!existsSync(configPath)) {
    return {}
  }
  const data = await readFile(configPath, 'utf-8')
  return JSON.parse(data)
}

ipcMain.handle('get-config', async (): Promise<AppConfig> => {
  return loadConfig()
})

ipcMain.handle('set-config', async (_, config: Partial<AppConfig>) => {
  await ensureConfigDir()
  const configPath = getConfigPath()
  const existing = await loadConfig()
  const merged = { ...existing, ...config }
  await writeFile(configPath, JSON.stringify(merged, null, 2))
})

// ============= OpenRouter API Integration =============

const WRITING_EVALUATOR_SYSTEM_PROMPT = `You are an expert DELF B2 French writing examiner. Evaluate the student's text according to the official DELF B2 Production écrite criteria.

## Scoring Grid (Total: 25 points)

### 1. Compétence pragmatique (10 points)

**Réalisation de la tâche (0-5 points)**
- 0: No response or completely off-topic
- 1: Below target level - partially addresses the task, missing key elements
- 3: B2 level - adequately addresses all aspects of the task
- 5: B2+ - fully and effectively addresses the task with relevant details

**Cohérence et cohésion (0-5 points)**
- 0: No logical organization
- 1: Below target - weak structure, limited use of connectors
- 3: B2 level - clear organization, appropriate use of logical connectors
- 5: B2+ - excellent flow, sophisticated use of discourse markers

### 2. Compétence sociolinguistique (5 points)

**Adéquation sociolinguistique (0-5 points)**
- 0: Inappropriate register throughout
- 1: Below target - inconsistent register, some inappropriate formulas
- 3: B2 level - appropriate register and conventions for text type
- 5: B2+ - masterful use of register, politeness formulas, and conventions

### 3. Compétence linguistique (10 points)

**Lexique (0-5 points)**
- 0: Vocabulary too limited to communicate
- 1: Below target - basic vocabulary, frequent errors affecting comprehension
- 3: B2 level - adequate vocabulary for the topic, occasional errors
- 5: B2+ - rich and precise vocabulary, very few errors

**Morphosyntaxe (0-5 points)**
- 0: Grammar prevents comprehension
- 1: Below target - frequent errors in basic structures
- 3: B2 level - good control of complex structures, some errors
- 5: B2+ - excellent grammar, rare errors only

## Text Type Requirements

**Lettre formelle (Formal Letter):**
- Proper opening/closing formulas (Monsieur/Madame, Veuillez agréer...)
- Clear statement of purpose
- Structured arguments
- Polite but firm tone when complaining/requesting

**Réponse au courrier des lecteurs (Reader Response):**
- Appropriate greeting/sign-off for forums
- Clear position statement
- Well-developed arguments with examples
- Engaging with the original message/topic

**Article:**
- Engaging title (if appropriate)
- Clear introduction presenting the topic
- Developed body with examples
- Conclusion with synthesis or call to action

## Evaluation Instructions

1. First, verify the word count (minimum 250 words)
2. Identify the text type and check format compliance
3. Evaluate each criterion independently
4. Provide specific examples from the text for each score
5. Give constructive feedback in French

You MUST respond with valid JSON only, no other text. Use this exact structure:
{
  "scores": {
    "task_completion": { "score": <0-5>, "feedback": "<feedback in French>" },
    "coherence_cohesion": { "score": <0-5>, "feedback": "<feedback in French>" },
    "sociolinguistic": { "score": <0-5>, "feedback": "<feedback in French>" },
    "lexique": { "score": <0-5>, "feedback": "<feedback in French>" },
    "morphosyntax": { "score": <0-5>, "feedback": "<feedback in French>" }
  },
  "total": <sum of all scores>,
  "wordCount": <actual word count>,
  "overallFeedback": "<general feedback in French>",
  "strengths": ["<strength 1 in French>", "<strength 2 in French>"],
  "improvements": ["<improvement 1 in French>", "<improvement 2 in French>"]
}`

async function callOpenRouter(
  apiKey: string,
  model: string,
  activity: WritingActivity,
  userText: string
): Promise<EvaluationResponse> {
  // Build the user prompt with activity context
  let taskDescription = ''
  if (activity.type === 'formal_letter') {
    taskDescription = `Type de texte: Lettre formelle\n`
    if (activity.context) taskDescription += `Contexte: ${activity.context}\n`
    taskDescription += `Tâche: ${activity.task}\n`
  } else if (activity.type === 'reader_response') {
    taskDescription = `Type de texte: Réponse au courrier des lecteurs / Forum\n`
    if (activity.stimulus) taskDescription += `Message original: ${activity.stimulus}\n`
    if (activity.context) taskDescription += `Contexte: ${activity.context}\n`
    taskDescription += `Tâche: ${activity.task}\n`
  } else {
    taskDescription = `Type de texte: Article\n`
    if (activity.topic) taskDescription += `Sujet: ${activity.topic}\n`
    taskDescription += `Tâche: ${activity.task}\n`
  }
  taskDescription += `Exigence: ${activity.requirements}`

  const userPrompt = `## Consigne de l'exercice

${taskDescription}

## Texte de l'étudiant à évaluer

${userText}

---

Évaluez ce texte selon les critères DELF B2 et répondez en JSON.`

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      'HTTP-Referer': 'https://github.com/easons-practice/delf',
      'X-Title': 'DELF Practice App'
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: WRITING_EVALUATOR_SYSTEM_PROMPT },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.3,
      max_tokens: 2000
    })
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`OpenRouter API error: ${response.status} - ${error}`)
  }

  const data = await response.json() as {
    choices: Array<{ message: { content: string } }>
  }
  const content = data.choices[0]?.message?.content

  if (!content) {
    throw new Error('No response from OpenRouter')
  }

  // Parse JSON response
  try {
    // Try to extract JSON from the response (in case there's extra text)
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error('No JSON found in response')
    }
    return JSON.parse(jsonMatch[0]) as EvaluationResponse
  } catch {
    throw new Error(`Failed to parse evaluation response: ${content.substring(0, 200)}...`)
  }
}

// ============= Part D (Speaking) IPC Handlers =============

function getAudioStoragePath(): string {
  return join(homedir(), '.ea', 'delf', 'user', 'audio', 'part-d')
}

async function ensureAudioStorageDir(): Promise<void> {
  const audioDir = getAudioStoragePath()
  if (!existsSync(audioDir)) {
    await mkdir(audioDir, { recursive: true })
  }
}

ipcMain.handle('load-speaking-index', async (): Promise<SpeakingIndex> => {
  const indexPath = join(getDataPath('part-d'), 'index.json')
  const data = await readFile(indexPath, 'utf-8')
  return JSON.parse(data)
})

ipcMain.handle('load-speaking-answers', async (): Promise<SpeakingAnswerData> => {
  const answersPath = join(getDataPath('part-d'), 'answer.json')
  const data = await readFile(answersPath, 'utf-8')
  return JSON.parse(data)
})

ipcMain.handle('save-audio-recording', async (_, sessionId: string, activityId: number, audioBase64: string): Promise<string> => {
  await ensureAudioStorageDir()
  const filename = `${sessionId}_activity_${activityId}.webm`
  const filepath = join(getAudioStoragePath(), filename)

  // Remove data URL prefix if present
  const base64Data = audioBase64.replace(/^data:audio\/\w+;base64,/, '')
  const buffer = Buffer.from(base64Data, 'base64')
  await writeFile(filepath, buffer)

  return filepath
})

ipcMain.handle('load-audio-recording', async (_, audioPath: string): Promise<string> => {
  const buffer = await readFile(audioPath)
  const base64 = buffer.toString('base64')
  return `data:audio/webm;base64,${base64}`
})

ipcMain.handle('evaluate-speaking', async (_, activity: SpeakingActivity, audioBase64: string): Promise<SpeakingEvaluationResponse> => {
  const config = await loadConfig()
  if (!config.openrouter_api_key) {
    throw new Error('OpenRouter API key not configured. Please set it in Settings.')
  }

  const model = config.openrouter_voice_model || 'google/gemini-3-flash-preview'
  const response = await callOpenRouterVoice(config.openrouter_api_key, model, activity, audioBase64)
  return response
})

ipcMain.handle('save-speaking-session', async (_, session: SpeakingSession) => {
  await ensureUserDataDir()
  const historyPath = join(getUserDataPath(), 'history.json')

  let history: UserHistory = {
    sessions: [],
    stats: { 'part-a': {}, 'part-b': {}, 'part-c': {}, 'part-d': {} }
  }
  if (existsSync(historyPath)) {
    const data = await readFile(historyPath, 'utf-8')
    history = JSON.parse(data)
    if (!history.stats['part-d']) history.stats['part-d'] = {}
  }

  // Add speaking session to sessions array
  history.sessions.push(session as unknown as Session)

  // Update stats for Part D (score out of 25 -> percentage)
  const { exercise, activity, evaluation } = session
  if (!history.stats['part-d'][exercise]) {
    history.stats['part-d'][exercise] = {}
  }
  const score = Math.round((evaluation.total / 25) * 100)
  const existing = history.stats['part-d'][exercise][activity]
  history.stats['part-d'][exercise][activity] = {
    attempts: (existing?.attempts || 0) + 1,
    bestScore: Math.max(existing?.bestScore || 0, score),
    lastAttempt: session.timestamp
  }

  await writeFile(historyPath, JSON.stringify(history, null, 2))
})

// ============= OpenRouter Voice API Integration =============

const SPEAKING_EVALUATOR_SYSTEM_PROMPT = `You are a DELF B2 oral production examiner. Evaluate the candidate's spoken French response based on the official DELF B2 grading criteria.

## Grading Criteria (25 points total)

### 1. Compétences pragmatique et sociolinguistique (10 points)

**Réalisation de la tâche : monologue suivi (5 points)**
- 0: Non répondu ou production insuffisante
- 1: En dessous du niveau ciblé - Arguments peu développés, structure confuse
- 3: Au niveau ciblé B2 - Argumentation méthodique, points significatifs mis en évidence
- 5: B2+ - Argumentation claire et riche, exemples pertinents, enchaînement logique

**Réalisation de la tâche : exercice en interaction (5 points)**
- Note: For monologue-only evaluation, assess the candidate's ability to anticipate counterarguments and address potential questions within their speech.
- 0: No anticipation of alternative viewpoints
- 1: Minimal consideration of other perspectives
- 3: Good ability to address counterarguments
- 5: Excellent integration of multiple perspectives

### 2. Compétence linguistique (15 points)

**Lexique (5 points)**
- 0: Vocabulaire très limité, nombreuses erreurs
- 1: Vocabulaire basique, erreurs fréquentes affectant la compréhension
- 3: Vocabulaire adéquat pour le sujet, quelques imprécisions
- 5: Vocabulaire riche et précis, expressions idiomatiques appropriées

**Morphosyntaxe (5 points)**
- 0: Structures très simples avec erreurs systématiques
- 1: Structures limitées, erreurs fréquentes
- 3: Bonne maîtrise des structures courantes, erreurs occasionnelles
- 5: Excellente maîtrise grammaticale, structures complexes bien utilisées

**Maîtrise du système phonologique (5 points)**
- 0: Prononciation très difficile à comprendre
- 1: Prononciation souvent incorrecte, accent fort
- 3: Prononciation claire, intonation naturelle, quelques erreurs mineures
- 5: Prononciation excellente, prosodie naturelle française

## Output Format
You MUST respond with valid JSON only, no other text. Use this exact structure:
{
  "scores": {
    "monologue_suivi": { "score": <0-5>, "feedback": "<feedback in French>" },
    "interaction": { "score": <0-5>, "feedback": "<feedback in French>" },
    "lexique": { "score": <0-5>, "feedback": "<feedback in French>" },
    "morphosyntax": { "score": <0-5>, "feedback": "<feedback in French>" },
    "phonologie": { "score": <0-5>, "feedback": "<feedback in French>" }
  },
  "total": <sum of all scores>,
  "duration_seconds": <estimated duration>,
  "transcription": "<Full transcription of the speech in French>",
  "overallFeedback": "<general feedback in French>",
  "strengths": ["<strength 1 in French>", "<strength 2 in French>"],
  "improvements": ["<improvement 1 in French>", "<improvement 2 in French>"]
}

Provide all feedback in French. Be encouraging but honest in your assessment.`

async function callOpenRouterVoice(
  apiKey: string,
  model: string,
  activity: SpeakingActivity,
  audioBase64: string
): Promise<SpeakingEvaluationResponse> {
  // Build the user prompt with activity context
  const userPrompt = `## Sujet du monologue

**${activity.title}**

${activity.content}

${activity.source ? `Source: ${activity.source}` : ''}

---

Évaluez la production orale de l'étudiant selon les critères DELF B2 et répondez en JSON.
Transcrivez d'abord intégralement ce que l'étudiant a dit, puis évaluez chaque critère.`

  // Prepare audio data - ensure it's in the right format
  const audioData = audioBase64.replace(/^data:audio\/\w+;base64,/, '')

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      'HTTP-Referer': 'https://github.com/easons-practice/delf',
      'X-Title': 'DELF Practice App'
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: SPEAKING_EVALUATOR_SYSTEM_PROMPT },
        {
          role: 'user',
          content: [
            { type: 'text', text: userPrompt },
            {
              type: 'input_audio',
              input_audio: {
                data: audioData,
                format: 'wav'
              }
            }
          ]
        }
      ],
      temperature: 0.3,
      max_tokens: 4000
    })
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`OpenRouter API error: ${response.status} - ${error}`)
  }

  const data = await response.json() as {
    choices: Array<{ message: { content: string } }>
  }
  const content = data.choices[0]?.message?.content

  if (!content) {
    throw new Error('No response from OpenRouter')
  }

  // Parse JSON response
  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error('No JSON found in response')
    }
    return JSON.parse(jsonMatch[0]) as SpeakingEvaluationResponse
  } catch {
    throw new Error(`Failed to parse speaking evaluation response: ${content.substring(0, 200)}...`)
  }
}

// ============= Notes IPC Handlers =============

function getNotesPath(): string {
  return join(getUserDataPath(), 'notes.json')
}

async function loadNotesData(): Promise<NotesData> {
  await ensureUserDataDir()
  const notesPath = getNotesPath()
  if (!existsSync(notesPath)) {
    return { notes: [] }
  }
  const data = await readFile(notesPath, 'utf-8')
  return JSON.parse(data)
}

async function saveNotesData(data: NotesData): Promise<void> {
  await ensureUserDataDir()
  const notesPath = getNotesPath()
  await writeFile(notesPath, JSON.stringify(data, null, 2))
}

ipcMain.handle('load-note', async (_, part: Part, exercise: string, activity: string): Promise<Note | null> => {
  const data = await loadNotesData()
  return data.notes.find(n => n.part === part && n.exercise === exercise && n.activity === activity) ?? null
})

ipcMain.handle('save-note', async (_, part: Part, exercise: string, activity: string, content: string): Promise<Note> => {
  const data = await loadNotesData()
  const existingIndex = data.notes.findIndex(n => n.part === part && n.exercise === exercise && n.activity === activity)
  const now = new Date().toISOString()

  if (existingIndex >= 0) {
    // Update existing note
    data.notes[existingIndex].content = content
    data.notes[existingIndex].updatedAt = now
    await saveNotesData(data)
    return data.notes[existingIndex]
  } else {
    // Create new note
    const note: Note = {
      id: crypto.randomUUID(),
      part,
      exercise,
      activity,
      content,
      createdAt: now,
      updatedAt: now
    }
    data.notes.push(note)
    await saveNotesData(data)
    return note
  }
})

ipcMain.handle('delete-note', async (_, noteId: string): Promise<void> => {
  const data = await loadNotesData()
  data.notes = data.notes.filter(n => n.id !== noteId)
  await saveNotesData(data)
})

ipcMain.handle('load-all-notes', async (): Promise<Note[]> => {
  const data = await loadNotesData()
  // Sort by updatedAt descending
  return data.notes.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
})

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})
