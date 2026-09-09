import { basisFor, categories } from './legalBasis.js'
import { basisHtml } from './basisReport.js'
export default function BasisPanel({ id, project }) {
  const basis = basisFor(id, project)
  const label = basis.category === 'G' ? (id.startsWith('q-') ? 'Why does AtlasEye ask this?' : 'Basis for this control') : 'Why is this required?'
  return <details className="basis-panel" data-basis-id={id}>
    <summary aria-label={`${label} — ${basis.title}`}>{label}</summary>
    <p className="eyebrow">{categories[basis.category]}</p>
    <div dangerouslySetInnerHTML={{ __html: basisHtml(basis) }} />
  </details>
}
