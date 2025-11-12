import { AskResponse } from '../../lib/api'

interface CitationListProps {
  citations: AskResponse['citations']
}

export default function CitationList({ citations }: CitationListProps) {
  return (
    <div className="bg-dark-card rounded-lg p-6 border border-dark-border">
      <h3 className="text-lg font-semibold text-dark-text-primary mb-4">Citations</h3>
      <div className="space-y-3">
        {citations.map((citation, idx) => (
          <div key={citation.embeddingId} className="border-l-2 border-dark-accent-blue pl-4">
            <div className="flex items-start justify-between mb-1">
              <span className="text-sm font-medium text-dark-accent-blue">[#{idx + 1}]</span>
              <span className="text-xs text-dark-text-muted">
                {citation.ticker} • {new Date(citation.ts).toLocaleString()}
              </span>
            </div>
            <p className="text-sm text-dark-text-secondary mb-2">{citation.snippet}</p>
            {citation.url && (
              <a
                href={citation.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-dark-accent-blue hover:underline"
              >
                View source →
              </a>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
