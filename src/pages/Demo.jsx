import { useEffect, useRef, useState } from 'react'
import {
  askAtlas,
  listenToAtlas,
  speakAtlas,
} from '../services/atlasApi'
import './Demo.css'

const sampleQuestions = [
  'Can we build a nuclear-powered AI data center in Ohio?',
  'What licenses would we need?',
  'Tell me what you know about NuScale reactors.',
]

const welcomeMessage = {
  id: 'atlas-welcome',
  role: 'atlas',
  text:
    "Hello. I'm Atlas. Ask me anything about nuclear engineering, licensing, deployment, construction, or operations.",
}

function formatIntent(intent) {
  return String(intent || '')
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function Demo() {
  const [messages, setMessages] = useState([welcomeMessage])
  const [question, setQuestion] = useState('')
  const [status, setStatus] = useState('idle')
  const [listening, setListening] = useState(false)
  const [speaking, setSpeaking] = useState(false)
  const [playbackRequired, setPlaybackRequired] = useState(false)
  const [voiceError, setVoiceError] = useState('')

  const threadRef = useRef(null)
  const recorderRef = useRef(null)
  const streamRef = useRef(null)
  const chunksRef = useRef([])
  const audioRef = useRef(null)
  const audioUrlRef = useRef(null)

  useEffect(() => {
    const thread = threadRef.current

    if (!thread) {
      return
    }

    thread.scrollTo({
      top: thread.scrollHeight,
      behavior: 'smooth',
    })
  }, [messages, status])

  useEffect(() => {
    return () => {
      const recorder = recorderRef.current

      if (
        recorder &&
        recorder.state !== 'inactive'
      ) {
        recorder.onstop = null
        recorder.stop()
      }

      const audio = audioRef.current

      if (audio) {
        audio.pause()
        audioRef.current = null
      }

      if (audioUrlRef.current) {
        URL.revokeObjectURL(
          audioUrlRef.current,
        )
        audioUrlRef.current = null
      }

      streamRef.current
        ?.getTracks()
        .forEach((track) => track.stop())
    }
  }, [])

  async function submitQuestion(event, suppliedQuestion) {
    event?.preventDefault()

    const text = String(
      suppliedQuestion ?? question,
    ).trim()

    if (!text || status === 'thinking') {
      return
    }

    setMessages((current) => [
      ...current,
      {
        id: `user-${Date.now()}`,
        role: 'user',
        text,
      },
    ])

    setQuestion('')
    setVoiceError('')
    setStatus('thinking')

    try {
      const result = await askAtlas(text)

      const answer =
        result.answer ||
        result.response ||
        result.conclusion ||
        'Atlas completed the analysis.'

      setMessages((current) => [
        ...current,
        {
          id: `atlas-${Date.now()}`,
          role: 'atlas',
          text: answer,
          result,
        },
      ])

      setStatus('complete')
    } catch (requestError) {
      setMessages((current) => [
        ...current,
        {
          id: `atlas-error-${Date.now()}`,
          role: 'atlas',
          error: true,
          text:
            requestError instanceof Error
              ? requestError.message
              : 'I could not complete that analysis.',
        },
      ])

      setStatus('error')
    }
  }

  function handleKeyDown(event) {
    if (
      event.key === 'Enter' &&
      !event.shiftKey &&
      !event.nativeEvent.isComposing
    ) {
      event.preventDefault()
      submitQuestion(event)
    }
  }

  function stopAtlasVoice() {
    const audio = audioRef.current

    if (audio) {
      audio.onended = null
      audio.onerror = null
      audio.pause()
      audio.currentTime = 0
      audioRef.current = null
    }

    if (audioUrlRef.current) {
      URL.revokeObjectURL(
        audioUrlRef.current,
      )
      audioUrlRef.current = null
    }

    setSpeaking(false)
    setPlaybackRequired(false)
  }

  async function playAtlasVoice(text) {
    stopAtlasVoice()

    try {
      setSpeaking(true)

      const audioBlob =
        await speakAtlas(text)

      const audioUrl =
        URL.createObjectURL(audioBlob)

      const audio = new Audio(audioUrl)

      audio.playsInline = true
      audioRef.current = audio
      audioUrlRef.current = audioUrl

      const finishPlayback = () => {
        if (audioRef.current === audio) {
          audioRef.current = null
        }

        if (audioUrlRef.current === audioUrl) {
          URL.revokeObjectURL(audioUrl)
          audioUrlRef.current = null
        }

        setSpeaking(false)
        setPlaybackRequired(false)
      }

      audio.onended = finishPlayback

      audio.onerror = () => {
        finishPlayback()
        setVoiceError(
          'Atlas generated the response, but the audio could not be played.',
        )
      }

      try {
        await audio.play()
      } catch (error) {
        if (
          error instanceof DOMException &&
          error.name === 'NotAllowedError'
        ) {
          setSpeaking(false)
          setPlaybackRequired(true)
          setVoiceError('')
          return
        }

        throw error
      }
    } catch (error) {
      stopAtlasVoice()

      setVoiceError(
        error instanceof Error
          ? `Atlas answered, but could not speak: ${error.message}`
          : 'Atlas answered, but could not speak.',
      )
    }
  }

  function resumeAtlasVoice() {
    const audio = audioRef.current

    if (!audio) {
      setPlaybackRequired(false)
      setVoiceError(
        'The Atlas audio response is no longer available.',
      )
      return
    }

    setPlaybackRequired(false)
    setVoiceError('')
    setSpeaking(true)

    const playback = audio.play()

    playback?.catch((error) => {
      setSpeaking(false)
      setPlaybackRequired(true)

      setVoiceError(
        error instanceof Error
          ? `Audio playback failed: ${error.message}`
          : 'Audio playback failed.',
      )
    })
  }

  async function toggleVoiceInput() {
    if (listening) {
      const recorder = recorderRef.current

      if (
        recorder &&
        recorder.state !== 'inactive'
      ) {
        recorder.stop()
      }

      return
    }

    stopAtlasVoice()

    if (
      !navigator.mediaDevices?.getUserMedia ||
      typeof MediaRecorder === 'undefined'
    ) {
      setVoiceError(
        'Audio recording is not supported by this browser.',
      )
      return
    }

    try {
      const stream =
        await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        })

      streamRef.current = stream

      const supportedTypes = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/ogg;codecs=opus',
      ]

      const mimeType =
        supportedTypes.find((type) =>
          MediaRecorder.isTypeSupported(type),
        ) || ''

      const recorder = new MediaRecorder(
        stream,
        mimeType ? { mimeType } : undefined,
      )

      recorderRef.current = recorder
      chunksRef.current = []

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data)
        }
      }

      recorder.onerror = () => {
        setListening(false)
        setVoiceError(
          'The browser could not record microphone audio.',
        )
      }

      recorder.onstop = async () => {
        setListening(false)

        stream
          .getTracks()
          .forEach((track) => track.stop())

        streamRef.current = null
        recorderRef.current = null

        const audio = new Blob(
          chunksRef.current,
          {
            type:
              recorder.mimeType ||
              mimeType ||
              'audio/webm',
          },
        )

        chunksRef.current = []

        if (audio.size < 100) {
          setVoiceError(
            'No microphone audio was recorded.',
          )
          return
        }

        setStatus('thinking')
        setVoiceError('')

        try {
          const result =
            await listenToAtlas(audio)

          const transcript = String(
            result.question ||
            result.transcription?.transcript ||
            '',
          ).trim()

          const answer =
            result.answer ||
            result.response ||
            result.conclusion ||
            'Atlas completed the analysis.'

          setMessages((current) => [
            ...current,
            ...(transcript
              ? [
                  {
                    id: `user-${Date.now()}`,
                    role: 'user',
                    text: transcript,
                  },
                ]
              : []),
            {
              id: `atlas-${Date.now()}-voice`,
              role: 'atlas',
              text: answer,
              result,
            },
          ])

          setStatus('complete')
          void playAtlasVoice(answer)
        } catch (error) {
          setVoiceError(
            error instanceof Error
              ? error.message
              : 'Atlas could not understand the recording.',
          )

          setStatus('error')
        }
      }

      recorder.start()
      setQuestion('')
      setVoiceError('')
      setListening(true)
    } catch (error) {
      setListening(false)

      if (
        error instanceof DOMException &&
        error.name === 'NotAllowedError'
      ) {
        setVoiceError(
          'Microphone access was denied. Allow it and try again.',
        )
      } else {
        setVoiceError(
          'Atlas could not access the microphone.',
        )
      }
    }
  }

  return (
    <main className="demo-shell">
      <header className="demo-header">
        <a className="demo-brand" href="/">
          <span className="demo-brand-mark" />
          ATLAS
        </a>

        <a className="demo-home-link" href="/">
          Atlas Eye
        </a>
      </header>

      <section className="demo-chat-main">
        <div className="demo-chat-panel">
          <header className="demo-chat-topbar">
            <div className="demo-atlas-identity">
              <span className="demo-atlas-avatar" />

              <div>
                <strong>Atlas</strong>
                <span>
                  {listening
                    ? 'Listening...'
                    : speaking
                      ? 'Speaking...'
                      : status === 'thinking'
                        ? 'Reasoning...'
                        : 'Ready'}
                </span>
              </div>
            </div>

            <span className="demo-online-indicator">
              Online
            </span>
          </header>

          <div
            ref={threadRef}
            className="demo-thread"
            aria-live="polite"
          >
            {messages.map((message) => (
              <div
                key={message.id}
                className={`demo-message demo-message-${message.role}`}
              >
                {message.role === 'atlas' && (
                  <span className="demo-message-avatar">
                    A
                  </span>
                )}

                <div
                  className={`demo-message-content ${
                    message.error
                      ? 'demo-message-error'
                      : ''
                  }`}
                >
                  <p>{message.text}</p>

                  {message.result && (
                    <div className="demo-message-meta">
                      {message.result.intent && (
                        <span>
                          {formatIntent(
                            message.result.intent,
                          )}
                        </span>
                      )}

                      {message.result.confidence != null && (
                        <span>
                          {Math.round(
                            Number(
                              message.result.confidence,
                            ) * 100,
                          )}
                          % confidence
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {status === 'thinking' && (
              <div className="demo-message demo-message-atlas">
                <span className="demo-message-avatar">
                  A
                </span>

                <div className="demo-thinking-message">
                  <span />
                  <span />
                  <span />
                </div>
              </div>
            )}
          </div>

          {messages.length === 1 && (
            <div className="demo-suggestions">
              {sampleQuestions.map((sample) => (
                <button
                  key={sample}
                  type="button"
                  onClick={() =>
                    submitQuestion(undefined, sample)
                  }
                >
                  {sample}
                </button>
              ))}
            </div>
          )}

          <form
            className="demo-composer"
            onSubmit={submitQuestion}
          >
            {playbackRequired && (
              <button
                className="demo-playback-button"
                type="button"
                onClick={resumeAtlasVoice}
              >
                <span aria-hidden="true">▶</span>
                Hear Atlas
              </button>
            )}

            {voiceError && (
              <p className="demo-voice-error">
                {voiceError}
              </p>
            )}

            <div className="demo-composer-row">
              <textarea
                value={question}
                onChange={(event) =>
                  setQuestion(event.target.value)
                }
                onKeyDown={handleKeyDown}
                placeholder={
                  listening
                    ? 'Listening...'
                    : 'Ask Atlas anything...'
                }
                rows="1"
                disabled={status === 'thinking'}
                aria-label="Ask Atlas"
              />

              <button
                className={`demo-mic-button ${
                  listening ? 'is-listening' : ''
                }`}
                type="button"
                onClick={toggleVoiceInput}
                disabled={status === 'thinking'}
                aria-label={
                  listening
                    ? 'Stop listening'
                    : 'Ask with your voice'
                }
                title={
                  listening
                    ? 'Stop listening'
                    : 'Ask with your voice'
                }
              >
                <svg
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path d="M12 15a3.5 3.5 0 0 0 3.5-3.5v-5a3.5 3.5 0 1 0-7 0v5A3.5 3.5 0 0 0 12 15Z" />
                  <path d="M5.5 11.5a6.5 6.5 0 0 0 13 0" />
                  <path d="M12 18v3" />
                </svg>
              </button>

              <button
                className="demo-send-button"
                type="submit"
                disabled={
                  !question.trim() ||
                  status === 'thinking' ||
                  listening
                }
              >
                Ask Atlas
              </button>
            </div>

            <p className="demo-composer-help">
              Enter to send · Shift+Enter for a new line
            </p>
          </form>
        </div>
      </section>
    </main>
  )
}

export default Demo
