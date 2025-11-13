import { useState } from 'react'
import TickerSelector from '../sentiment/TickerSelector'

interface AskInputProps {
  onSubmit: (query: string, tickers: string[]) => void
  isLoading?: boolean
}

export default function AskInput({ onSubmit, isLoading }: AskInputProps) {
  const [query, setQuery] = useState('')
  const [tickers, setTickers] = useState<string[]>([])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (query.trim() && tickers.length > 0) {
      onSubmit(query, tickers)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-dark-text-secondary mb-2">
          Select Tickers
        </label>
        <TickerSelector selected={tickers} onSelect={setTickers} />
      </div>
      <div>
        <label className="block text-sm font-medium text-dark-text-secondary mb-2">
          Your Question
        </label>
        <textarea
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            // Submit on Enter (but allow Shift+Enter for new lines)
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              if (query.trim() && tickers.length > 0) {
                handleSubmit(e as any)
              }
            }
          }}
          placeholder="e.g., Why is NVDA up today?"
          rows={4}
          className="w-full bg-dark-surface border border-dark-border rounded px-3 py-2 text-dark-text-primary placeholder-dark-text-muted focus:outline-none focus:border-dark-accent-blue resize-none"
        />
      </div>
      <button
        type="submit"
        disabled={!query.trim() || tickers.length === 0 || isLoading}
        className="w-full px-4 py-3 bg-dark-accent-blue text-white rounded hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? 'Asking...' : 'Ask'}
      </button>
    </form>
  )
}
