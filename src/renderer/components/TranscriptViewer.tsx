import { useState } from 'react'
import { PdfViewer } from './PdfViewer'
import type { Part } from '../../shared/types'

interface TranscriptViewerProps {
  part: Part
  transcriptPath: string | null
}

export function TranscriptViewer({ part, transcriptPath }: TranscriptViewerProps) {
  const [visible, setVisible] = useState(false)

  if (!transcriptPath) return null

  return (
    <div className="transcript-viewer">
      <button className="transcript-toggle" onClick={() => setVisible(!visible)}>
        {visible ? '▼ Hide Transcript' : '▶ Show Transcript'}
      </button>
      {visible && (
        <PdfViewer part={part} pdfPath={transcriptPath} className="transcript-pdf" />
      )}
    </div>
  )
}
