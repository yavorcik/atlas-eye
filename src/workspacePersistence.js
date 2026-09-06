// Web Locks serialize the read/compare/write transaction across same-origin tabs.
// Revisions bind every write; the epoch is a reset tombstone for stale tabs.
export const STORE_KEY = 'atlas.publicDemoWorkspace.v2'
export const SCHEMA_VERSION = 3
const equal = (a, b) => JSON.stringify(a) === JSON.stringify(b)
export function mergeProject(base, proposed, latest, path = '') {
  if (equal(base, proposed)) return latest
  if (equal(base, latest) || equal(proposed, latest)) return proposed
  if (path === 'revision') return latest
  if (path === 'history') return [...new Map([...proposed, ...latest].map(item => [item.id, item])).values()].sort((a, b) => b.at.localeCompare(a.at))
  if (base && proposed && latest && !Array.isArray(base) && typeof base === 'object' && typeof proposed === 'object' && typeof latest === 'object') {
    return Object.fromEntries([...new Set([...Object.keys(base), ...Object.keys(proposed), ...Object.keys(latest)])].map(key => [key, mergeProject(base[key], proposed[key], latest[key], path ? `${path}.${key}` : key)]))
  }
  throw new Error(`Conflicting edits to ${path || 'project'}. Your changes are retained for recovery. Download them before loading the saved version.`)
}
export function migrateWorkspace(saved, samples) {
  if (saved && ![2, 3].includes(saved.schemaVersion)) throw new Error('Unsupported saved workspace version. Saved data has been preserved.')
  const result = { schemaVersion: SCHEMA_VERSION, epoch: saved?.epoch || 'original', projects: { ...samples, ...saved?.projects }, lastSavedAt: saved?.lastSavedAt || '' }
  for (const project of Object.values(result.projects)) {
    project.revision ||= 0
    if (project.id === 'fuel-transport' && project.inputs.quantityValue === undefined) {
      const old = String(project.inputs.quantity ?? '')
      const match = old.match(/^\s*(\S+)\s+(\S+)\s*$/)
      project.inputs.quantityValue = match ? match[1] : old
      project.inputs.quantityUnit = match ? match[2] : ''
    }
  }
  return result
}
export async function workspaceTransaction(operation) {
  if (!navigator.locks?.request) throw new Error('Safe browser persistence is unavailable: Web Locks are required. Keep this page open and download your work.')
  return navigator.locks.request('atlas-demo-workspace-v3', async () => {
    if (window.__ATLAS_DEMO_FORCE_STORAGE_FAILURE__) throw new Error('Browser storage failed (test injection).')
    const raw = localStorage.getItem(STORE_KEY)
    const next = operation(raw ? JSON.parse(raw) : null)
    if (next) localStorage.setItem(STORE_KEY, JSON.stringify(next))
    return next
  })
}
