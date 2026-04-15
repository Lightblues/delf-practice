import { useState, useEffect, useMemo } from 'react'
import type { Part, Note } from '../../shared/types'

interface NotesPageProps {
  onClose: () => void
  onNavigate: (part: Part, exercise: string, activity: string) => void
}

const PART_LABELS: Record<Part, string> = {
  'part-a': 'Compréhension orale',
  'part-b': 'Compréhension écrite',
  'part-c': 'Production écrite',
  'part-d': 'Production orale'
}

function formatDate(iso: string): string {
  const date = new Date(iso)
  return date.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function formatActivityName(activity: string): string {
  return activity.replace('Activite_', 'Activité ')
}

function formatExerciseName(exercise: string): string {
  if (exercise.startsWith('Exercice_')) {
    return exercise.replace('Exercice_', 'Exercice ')
  }
  const labels: Record<string, string> = {
    'formal_letter': 'Lettre formelle',
    'reader_response': 'Courrier des lecteurs',
    'article': 'Article',
    'monologue_suivi': 'Monologue suivi'
  }
  return labels[exercise] || exercise
}

export function NotesPage({ onClose, onNavigate }: NotesPageProps) {
  const [notes, setNotes] = useState<Note[]>([])
  const [loading, setLoading] = useState(true)
  const [filterPart, setFilterPart] = useState<Part | 'all'>('all')
  const [sortBy, setSortBy] = useState<'updatedAt' | 'createdAt'>('updatedAt')

  useEffect(() => {
    setLoading(true)
    window.electronAPI.loadAllNotes()
      .then(setNotes)
      .catch(err => console.error('Failed to load notes:', err))
      .finally(() => setLoading(false))
  }, [])

  const filteredNotes = useMemo(() => {
    let result = notes
    if (filterPart !== 'all') {
      result = result.filter(n => n.part === filterPart)
    }
    return result.sort((a, b) => {
      const dateA = new Date(sortBy === 'updatedAt' ? a.updatedAt : a.createdAt)
      const dateB = new Date(sortBy === 'updatedAt' ? b.updatedAt : b.createdAt)
      return dateB.getTime() - dateA.getTime()
    })
  }, [notes, filterPart, sortBy])

  const handleNavigate = (note: Note) => {
    onNavigate(note.part, note.exercise, note.activity)
  }

  const handleDelete = async (noteId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm('Supprimer cette note ?')) return
    try {
      await window.electronAPI.deleteNote(noteId)
      setNotes(notes.filter(n => n.id !== noteId))
    } catch (err) {
      console.error('Failed to delete note:', err)
    }
  }

  return (
    <div className="notes-page-overlay" onClick={onClose}>
      <div className="notes-page" onClick={e => e.stopPropagation()}>
        <div className="notes-page-header">
          <h2>Mes Notes</h2>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="notes-filters">
          <div className="filter-group">
            <label>Partie:</label>
            <select value={filterPart} onChange={e => setFilterPart(e.target.value as Part | 'all')}>
              <option value="all">Toutes</option>
              <option value="part-a">Part A - Écoute</option>
              <option value="part-b">Part B - Lecture</option>
              <option value="part-c">Part C - Écrit</option>
              <option value="part-d">Part D - Oral</option>
            </select>
          </div>
          <div className="filter-group">
            <label>Trier par:</label>
            <select value={sortBy} onChange={e => setSortBy(e.target.value as 'updatedAt' | 'createdAt')}>
              <option value="updatedAt">Dernière modification</option>
              <option value="createdAt">Date de création</option>
            </select>
          </div>
          <span className="notes-count">{filteredNotes.length} note{filteredNotes.length !== 1 ? 's' : ''}</span>
        </div>

        <div className="notes-list">
          {loading ? (
            <div className="notes-loading">Chargement...</div>
          ) : filteredNotes.length === 0 ? (
            <div className="notes-empty">
              {filterPart === 'all'
                ? "Aucune note. Commencez à prendre des notes pendant vos exercices !"
                : "Aucune note pour cette partie."}
            </div>
          ) : (
            filteredNotes.map(note => (
              <div key={note.id} className="note-card" onClick={() => handleNavigate(note)}>
                <div className="note-card-header">
                  <span className="note-card-location">
                    {PART_LABELS[note.part]} &gt; {formatExerciseName(note.exercise)} &gt; {formatActivityName(note.activity)}
                  </span>
                  <span className="note-card-date">{formatDate(note.updatedAt)}</span>
                </div>
                <div className="note-card-content">
                  {note.content.length > 200
                    ? note.content.slice(0, 200) + '...'
                    : note.content}
                </div>
                <div className="note-card-actions">
                  <button
                    className="delete-btn"
                    onClick={(e) => handleDelete(note.id, e)}
                    title="Supprimer"
                  >
                    🗑
                  </button>
                  <button className="navigate-btn">Aller →</button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
