import { useEffect, useState, useRef, useCallback } from 'react'
import * as pdfjsLib from 'pdfjs-dist'
import type { Part } from '../../shared/types'

// Use local worker bundled with pdfjs-dist
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString()

interface PdfViewerProps {
  part: Part
  pdfPath: string | null
  className?: string
}

interface PageData {
  pageNum: number
  dataUrl: string
  width: number
  height: number
}

export function PdfViewer({ part, pdfPath, className }: PdfViewerProps) {
  const [pages, setPages] = useState<PageData[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const renderTaskRef = useRef<number>(0)

  const renderPdf = useCallback(async (p: Part, path: string, taskId: number) => {
    setLoading(true)
    setError(null)
    setPages([])

    try {
      const arrayBuffer = await window.electronAPI.loadPdf(p, path)

      // Check if this task is still current
      if (taskId !== renderTaskRef.current) return

      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise

      if (taskId !== renderTaskRef.current) return

      const renderedPages: PageData[] = []

      for (let i = 1; i <= pdf.numPages; i++) {
        if (taskId !== renderTaskRef.current) return

        const page = await pdf.getPage(i)
        const scale = 1.5
        const viewport = page.getViewport({ scale })

        const canvas = document.createElement('canvas')
        canvas.width = viewport.width
        canvas.height = viewport.height

        const context = canvas.getContext('2d')!
        await page.render({ canvasContext: context, viewport }).promise

        renderedPages.push({
          pageNum: i,
          dataUrl: canvas.toDataURL(),
          width: viewport.width,
          height: viewport.height
        })
      }

      if (taskId === renderTaskRef.current) {
        setPages(renderedPages)
      }
    } catch (err) {
      if (taskId === renderTaskRef.current) {
        setError(err instanceof Error ? err.message : 'Failed to load PDF')
      }
    } finally {
      if (taskId === renderTaskRef.current) {
        setLoading(false)
      }
    }
  }, [])

  useEffect(() => {
    if (!pdfPath) {
      setPages([])
      setLoading(false)
      setError(null)
      return
    }

    const taskId = ++renderTaskRef.current
    renderPdf(part, pdfPath, taskId)

    return () => {
      renderTaskRef.current++
    }
  }, [part, pdfPath, renderPdf])

  const panelClass = className ? `pdf-panel ${className}` : 'pdf-panel'

  if (!pdfPath) {
    return (
      <div className={panelClass}>
        <div className="pdf-loading">Select an activity to begin</div>
      </div>
    )
  }

  return (
    <div className={panelClass}>
      {loading && <div className="pdf-loading">Loading PDF...</div>}
      {error && <div className="pdf-loading" style={{ color: 'var(--error)' }}>{error}</div>}
      {pages.map(page => (
        <img
          key={page.pageNum}
          src={page.dataUrl}
          alt={`Page ${page.pageNum}`}
          className="pdf-page"
          style={{ width: page.width, height: page.height }}
        />
      ))}
    </div>
  )
}
