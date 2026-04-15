import { contextBridge, ipcRenderer } from 'electron'
import type { Part, Session, ElectronAPI, WritingActivity, WritingSession, AppConfig, SpeakingActivity, SpeakingSession } from '../shared/types'

const electronAPI: ElectronAPI = {
  // Part A/B
  loadIndex: (part: Part) => ipcRenderer.invoke('load-index', part),
  loadAnswers: (part: Part) => ipcRenderer.invoke('load-answers', part),
  loadPdf: (part: Part, path: string) => ipcRenderer.invoke('load-pdf', part, path),
  loadAudio: (part: Part, path: string) => ipcRenderer.invoke('load-audio', part, path),
  loadHistory: () => ipcRenderer.invoke('load-history'),
  saveSession: (session: Session) => ipcRenderer.invoke('save-session', session),
  getDataPath: (part: Part) => ipcRenderer.invoke('get-data-path', part),
  // Part C
  loadWritingIndex: () => ipcRenderer.invoke('load-writing-index'),
  loadWritingAnswers: () => ipcRenderer.invoke('load-writing-answers'),
  evaluateWriting: (activity: WritingActivity, userText: string) =>
    ipcRenderer.invoke('evaluate-writing', activity, userText),
  saveWritingSession: (session: WritingSession) =>
    ipcRenderer.invoke('save-writing-session', session),
  getWritingSessions: (exercise: string, activity: string) =>
    ipcRenderer.invoke('get-writing-sessions', exercise, activity),
  // Part D
  loadSpeakingIndex: () => ipcRenderer.invoke('load-speaking-index'),
  loadSpeakingAnswers: () => ipcRenderer.invoke('load-speaking-answers'),
  saveAudioRecording: (sessionId: string, activityId: number, audioBase64: string) =>
    ipcRenderer.invoke('save-audio-recording', sessionId, activityId, audioBase64),
  loadAudioRecording: (audioPath: string) =>
    ipcRenderer.invoke('load-audio-recording', audioPath),
  evaluateSpeaking: (activity: SpeakingActivity, audioBase64: string) =>
    ipcRenderer.invoke('evaluate-speaking', activity, audioBase64),
  saveSpeakingSession: (session: SpeakingSession) =>
    ipcRenderer.invoke('save-speaking-session', session),
  getSpeakingSessions: (exercise: string, activity: string) =>
    ipcRenderer.invoke('get-speaking-sessions', exercise, activity),
  // Config
  getConfig: () => ipcRenderer.invoke('get-config'),
  setConfig: (config: Partial<AppConfig>) => ipcRenderer.invoke('set-config', config),
  // Notes
  loadNote: (part: Part, exercise: string, activity: string) =>
    ipcRenderer.invoke('load-note', part, exercise, activity),
  saveNote: (part: Part, exercise: string, activity: string, content: string) =>
    ipcRenderer.invoke('save-note', part, exercise, activity, content),
  deleteNote: (noteId: string) => ipcRenderer.invoke('delete-note', noteId),
  loadAllNotes: () => ipcRenderer.invoke('load-all-notes')
}

contextBridge.exposeInMainWorld('electronAPI', electronAPI)
