import { useState } from 'react'

interface VoiceButtonProps {
  onTranscription: (text: string) => void
  /** Show raw transcript before AI cleaning */
  onRawTranscript?: (text: string) => void
  size?: 'compact' | 'large'
}

export default function VoiceButton({ onTranscription, onRawTranscript, size = 'compact' }: VoiceButtonProps) {
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

      // Show raw transcript immediately
      onRawTranscript?.(rawText)

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

  if (size === 'large') {
    return (
      <div className="flex flex-col items-center gap-3">
        <button
          type="button"
          onClick={handleVoice}
          disabled={recording || cleaning}
          className={`
            w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 shadow-lg
            ${recording
              ? 'bg-red-500 text-white shadow-red-500/40 animate-pulse scale-110'
              : cleaning
                ? 'bg-amber-500 text-white shadow-amber-500/30'
                : 'bg-gradient-to-br from-primary to-primary-dark text-white hover:shadow-xl hover:shadow-primary/40 hover:scale-105 active:scale-95'}
          `}
        >
          {recording ? (
            <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
              <circle cx="12" cy="12" r="6" />
            </svg>
          ) : cleaning ? (
            <svg className="animate-spin w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" className="opacity-25" />
              <path d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" className="opacity-75" fill="currentColor" />
            </svg>
          ) : (
            <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
              <line x1="12" y1="19" x2="12" y2="23" />
              <line x1="8" y1="23" x2="16" y2="23" />
            </svg>
          )}
        </button>

        <p className={`text-sm font-medium ${
          recording ? 'text-red-500' : cleaning ? 'text-amber-600' : 'text-text-muted'
        }`}>
          {recording ? 'Listening... speak now' : cleaning ? 'AI is cleaning your notes...' : 'Tap to speak'}
        </p>

        {/* Pipeline indicator */}
        <div className="flex items-center gap-2 text-[10px] text-text-muted">
          <span className={`flex items-center gap-1 ${recording ? 'text-red-500 font-bold' : ''}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${recording ? 'bg-red-500' : 'bg-text-muted/30'}`} />
            Voice
          </span>
          <svg className="w-3 h-3 text-text-muted/30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
          <span className={`flex items-center gap-1 ${cleaning ? 'text-amber-600 font-bold' : ''}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${cleaning ? 'bg-amber-500' : 'bg-text-muted/30'}`} />
            AI Cleans
          </span>
          <svg className="w-3 h-3 text-text-muted/30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-text-muted/30" />
            Clean Text
          </span>
        </div>
      </div>
    )
  }

  // Compact mode (original small button)
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
          AI cleaning...
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
