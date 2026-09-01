import { useEffect, useRef } from 'react'

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)'

export default function HistoricalAtlasNuclearEye() {
  const launchRef = useRef(null)
  const atmosphereRef = useRef(null)
  const logoRef = useRef(null)

  useEffect(() => {
    const launch = launchRef.current
    const atmosphere = atmosphereRef.current
    const logo = logoRef.current

    if (!launch || !atmosphere || !logo) return undefined

    const reducedMotion = window.matchMedia(REDUCED_MOTION_QUERY)

    const reset = () => {
      atmosphere.style.transform = ''
      logo.style.removeProperty('--atlas-parallax-x')
      logo.style.removeProperty('--atlas-parallax-y')
    }

    const handlePointerMove = (event) => {
      if (reducedMotion.matches) {
        reset()
        return
      }

      const x = (event.clientX / window.innerWidth - 0.5) * 2
      const y = (event.clientY / window.innerHeight - 0.5) * 2

      logo.style.setProperty('--atlas-parallax-x', `${x * 5}px`)
      logo.style.setProperty('--atlas-parallax-y', `${y * 4}px`)
      atmosphere.style.transform = `translate(${x * -7}px, ${y * -7}px)`
    }

    const handleMotionChange = () => {
      if (reducedMotion.matches) reset()
    }

    launch.addEventListener('pointermove', handlePointerMove)
    launch.addEventListener('pointerleave', reset)
    reducedMotion.addEventListener('change', handleMotionChange)

    return () => {
      launch.removeEventListener('pointermove', handlePointerMove)
      launch.removeEventListener('pointerleave', reset)
      reducedMotion.removeEventListener('change', handleMotionChange)
    }
  }, [])

  return (
    <div className="historical-eye-stage" data-historical-atlas-eye="true" ref={launchRef}>
      <div className="launch-atmosphere" aria-hidden="true" ref={atmosphereRef}>
        <div className="launch-orbit orbit-one" />
        <div className="launch-orbit orbit-two" />
        <div className="launch-orbit orbit-three" />
        <div className="launch-sweep" />
        <div className="launch-core-glow" />
      </div>
      <img
        src="/brand/atlas-nuclear-logo.png"
        alt="Atlas Nuclear red mechanical eye"
        className="launch-logo"
        ref={logoRef}
      />
    </div>
  )
}
