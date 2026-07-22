import './AtlasCore.css'

function AtlasCore({
  mode = 'identity',
  size = 'hero',
  label = 'ATLAS ONLINE',
  showLabel = true,
}) {
  return (
    <div
      className={[
        'atlas-core',
        `atlas-core--${mode}`,
        `atlas-core--${size}`,
      ].join(' ')}
      role="img"
      aria-label={`Atlas cognitive core, ${mode} state`}
    >
      <div className="atlas-core__field">
        <div className="atlas-core__glow" />

        <div className="atlas-core__orbit atlas-core__orbit--one" />
        <div className="atlas-core__orbit atlas-core__orbit--two" />
        <div className="atlas-core__orbit atlas-core__orbit--three" />

        <div className="atlas-core__sweep" />

        <div className="atlas-core__center">
          <div className="atlas-core__inner-ring" />
          <div className="atlas-core__iris" />
        </div>
      </div>

      {showLabel && (
        <p className="atlas-core__label">
          {label}
        </p>
      )}
    </div>
  )
}

export default AtlasCore
