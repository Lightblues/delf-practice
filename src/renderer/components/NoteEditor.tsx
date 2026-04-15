import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import type { Part, Note } from '../../shared/types'

interface NoteEditorProps {
  part: Part
  exercise: string
  activity: string
}

function debounce<T extends (...args: Parameters<T>) => void>(fn: T, delay: number) {
  let timeoutId: NodeJS.Timeout | null = null
  return (...args: Parameters<T>) => {
    if (timeoutId) clearTimeout(timeoutId)
    timeoutId = setTimeout(() => fn(...args), delay)
  }
}

export function NoteEditor({ part, exercise, activity }: NoteEditorProps) {
  const [content, setContent] = useState('')
  const [isExpanded, setIsExpanded] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved' | 'idle'>('idle')
  const [lastSaved, setLastSaved] = useState<string | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Load note when activity changes
  useEffect(() => {
    let mounted = true
    setContent('')
    setSaveStatus('idle')
    setLastSaved(null)

    window.electronAPI.loadNote(part, exercise, activity)
      .then((note: Note | null) => {
        if (mounted && note) {
          setContent(note.content)
          setLastSaved(note.updatedAt)
          setSaveStatus('saved')
          if (note.content) setIsExpanded(true)
        }
      })
      .catch(err => console.error('Failed to load note:', err))

    return () => { mounted = false }
  }, [part, exercise, activity])

  const saveNote = useCallback(async (text: string) => {
    if (!text.trim()) return
    setSaveStatus('saving')
    try {
      const note = await window.electronAPI.saveNote(part, exercise, activity, text)
      setSaveStatus('saved')
      setLastSaved(note.updatedAt)
    } catch (err) {
      console.error('Failed to save note:', err)
      setSaveStatus('unsaved')
    }
  }, [part, exercise, activity])

  const debouncedSave = useMemo(
    () => debounce((text: string) => saveNote(text), 1000),
    [saveNote]
  )

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value
    setContent(newContent)
    if (newContent.trim()) {
      setSaveStatus('unsaved')
      debouncedSave(newContent)
    } else {
      setSaveStatus('idle')
    }
  }

  const formatTime = (iso: string) => {
    const date = new Date(iso)
    return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
  }

  const statusText = useMemo(() => {
    switch (saveStatus) {
      case 'saving': return 'Enregistrement...'
      case 'saved': return lastSaved ? `Enregistré à ${formatTime(lastSaved)}` : 'Enregistré'
      case 'unsaved': return 'Non enregistré'
      default: return ''
    }
  }, [saveStatus, lastSaved])

  return (
    <div className="note-editor">
      <div
        className="note-header"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <span className="note-icon">📝</span>
        <span className="note-title">Notes</span>
        {content && !isExpanded && (
          <span className="note-preview">{content.slice(0, 30)}{content.length > 30 ? '...' : ''}</span>
        )}
        <span className={`note-toggle ${isExpanded ? 'expanded' : ''}`}>▼</span>
      </div>

      {isExpanded && (
        <div className="note-content">
          <textarea
            ref={textareaRef}
            value={content}
            onChange={handleChange}
            placeholder="Notez vos observations, points importants, vocabulaire..."
            className="note-textarea"
            rows={4}
          />
          <div className="note-footer">
            <span className={`note-status ${saveStatus}`}>{statusText}</span>
          </div>
        </div>
      )}
    </div>
  )
}
