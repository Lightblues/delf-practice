import { useState, useRef, useEffect } from 'react'
import type { Part } from '../../shared/types'

interface AudioPlayerProps {
  part: Part
  audioPath: string | null
}

export function AudioPlayer({ part, audioPath }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [audioSrc, setAudioSrc] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [playing, setPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)

  useEffect(() => {
    if (!audioPath) {
      setAudioSrc(null)
      setPlaying(false)
      setCurrentTime(0)
      setDuration(0)
      return
    }
    setLoading(true)
    setPlaying(false)
    window.electronAPI.loadAudio(part, audioPath).then(src => {
      setAudioSrc(src)
      setLoading(false)
    }).catch(() => {
      setAudioSrc(null)
      setLoading(false)
    })
  }, [part, audioPath])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const handleTimeUpdate = () => setCurrentTime(audio.currentTime)
    const handleDurationChange = () => setDuration(audio.duration || 0)
    const handleEnded = () => setPlaying(false)

    audio.addEventListener('timeupdate', handleTimeUpdate)
    audio.addEventListener('durationchange', handleDurationChange)
    audio.addEventListener('ended', handleEnded)

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate)
      audio.removeEventListener('durationchange', handleDurationChange)
      audio.removeEventListener('ended', handleEnded)
    }
  }, [audioSrc])

  const togglePlay = () => {
    const audio = audioRef.current
    if (!audio) return
    if (playing) {
      audio.pause()
    } else {
      audio.play()
    }
    setPlaying(!playing)
  }

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current
    if (!audio) return
    const time = parseFloat(e.target.value)
    audio.currentTime = time
    setCurrentTime(time)
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  if (!audioPath) return null

  return (
    <div className="audio-player">
      {audioSrc && <audio ref={audioRef} src={audioSrc} preload="metadata" />}
      <button className="play-btn" onClick={togglePlay} disabled={loading || !audioSrc}>
        {loading ? '...' : playing ? '⏸' : '▶'}
      </button>
      <span className="time">{formatTime(currentTime)}</span>
      <input
        type="range"
        className="seek-bar"
        min={0}
        max={duration || 0}
        value={currentTime}
        onChange={handleSeek}
        disabled={!audioSrc}
      />
      <span className="time">{formatTime(duration)}</span>
    </div>
  )
}
