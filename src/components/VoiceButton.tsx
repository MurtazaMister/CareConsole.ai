import { useState } from 'react'

interface VoiceButtonProps {
  onTranscription: (text: string) => void
}

export default function VoiceButton({ onTranscription }: VoiceButtonProps) {
  const [recording, setRecording] = useState(false)
  const [cleaning, setCleaning] = useState(false)

  const handleVoice = () => {
    const SR = (window as unknown as { SpeechRecognition?: new () => SpeechRecognition; webkitSpeechRecognition?: new () => SpeechRecognition }).SpeechRecognition
      ?? (window as unknown as { webkitSpeechRecognition?: new () => SpeechRecognition }).webkitSpeechRecognition
    if (!SR) {
      alert('Speech recognition is not supported in your browser. Please use Chrome or Edge.')
      return
    }

    const recognition = new SR()
    recognition.lang = 'en-US'
    recognition.interimResults = false
    recognition.continuous = false
    recognition.maxAlternatives = 1

    recognition.onstart = () => setRecording(true)

    recognition.onresult = async (event: SpeechRecognitionEvent) => {
      setRecording(false)
      const rawText = event.results[0]?.[0]?.transcript ?? ''
      if (!rawText.trim()) return

      setCleaning(true)
      try {
        const res = await fetch('/api/ai/clean-notes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ rawText }),
        })
        if (res.ok) {
          const data = await res.json()
          if (!data.skipped && data.text) {
            onTranscription(data.text)
          }
        } else {
          onTranscription(rawText)
        }
      } catch {
        onTranscription(rawText)
      } finally {
        setCleaning(false)
      }
    }

    recognition.onerror = () => setRecording(false)
    recognition.onend = () => setRecording(false)
    recognition.start()
  }

  return (
    <button
      type="button"
      onClick={handleVoice}
      disabled={recording || cleaning}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
        recording
          ? 'bg-red-50 text-red-600 border border-red-200 animate-pulse'
          : cleaning
            ? 'bg-amber-50 text-amber-600 border border-amber-200'
            : 'text-text-muted border border-border hover:border-primary/30 hover:text-primary hover:bg-primary/5'
      }`}
    >
      {recording ? (
        <>
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
            <circle cx="12" cy="12" r="6" />
          </svg>
          Listening...
        </>
      ) : cleaning ? (
        <>
          <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" className="opacity-25" />
            <path d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" className="opacity-75" fill="currentColor" />
          </svg>
          Cleaning up...
        </>
      ) : (
        <>
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
            <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
            <line x1="12" y1="19" x2="12" y2="23" />
            <line x1="8" y1="23" x2="16" y2="23" />
          </svg>
          Voice
        </>
      )}
    </button>
  )
}
