import research from './research.json' with { type: 'json' }

export const catalog = research
export function filterParts({ query = '', block = '', evidence = '' } = {}) {
  const words = query.toLocaleLowerCase().trim().split(/\s+/).filter(Boolean)
  return research.parts.filter(part => (!block || part.block === block) &&
    (!evidence || part.evidence === evidence) &&
    words.every(word => [part.component, part.company, part.role, part.purpose, part.block].join(' ').toLocaleLowerCase().includes(word)))
}
export function sourcesFor(part) {
  return research.sources.filter(source => source.url === part.url)
}
