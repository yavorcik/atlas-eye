import { useEffect, useRef, useState } from 'react'

export default function AtlasEye() {
  const ref = useRef(null)
  const [motion, setMotion] = useState({ x: 0, y: 0 })

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)')
    if (reduced.matches) return undefined

    function move(event) {
      const rect = ref.current?.getBoundingClientRect()
      if (!rect) return
      const x = Math.max(-1, Math.min(1, (event.clientX - (rect.left + rect.width / 2)) / (rect.width / 2)))
      const y = Math.max(-1, Math.min(1, (event.clientY - (rect.top + rect.height / 2)) / (rect.height / 2)))
      setMotion({ x: Number((x * 14).toFixed(2)), y: Number((y * 10).toFixed(2)) })
    }

    window.addEventListener('pointermove', move, { passive: true })
    return () => window.removeEventListener('pointermove', move)
  }, [])

  return (
    <div
      ref={ref}
      className="eye"
      aria-label="Active Atlas Eye"
      data-active-eye="true"
      style={{ '--eye-x': `${motion.x}px`, '--eye-y': `${motion.y}px` }}
    >
      <div className="eye-aperture" aria-hidden="true" />
      <div className="eye-core" aria-hidden="true" />
    </div>
  )
}
