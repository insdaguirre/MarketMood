import { useState } from 'react'

interface TickerSelectorProps {
  selected: string[]
  onSelect: (tickers: string[]) => void
}

const POPULAR_TICKERS = ['AAPL', 'NVDA', 'MSFT', 'AMZN', 'TSLA', 'GOOGL', 'META', 'JPM', 'XOM', 'BRK.B']

export default function TickerSelector({ selected, onSelect }: TickerSelectorProps) {
  const [input, setInput] = useState('')

  const handleAdd = () => {
    const ticker = input.toUpperCase().trim()
    if (ticker && !selected.includes(ticker)) {
      onSelect([...selected, ticker])
      setInput('')
    }
  }

  const handleRemove = (ticker: string) => {
    onSelect(selected.filter(t => t !== ticker))
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleAdd()}
          placeholder="Enter ticker (e.g., AAPL)"
          className="flex-1 bg-dark-surface border border-dark-border rounded px-3 py-2 text-dark-text-primary placeholder-dark-text-muted focus:outline-none focus:border-dark-accent-blue"
        />
        <button
          onClick={handleAdd}
          className="px-4 py-2 bg-dark-accent-blue text-white rounded hover:bg-blue-600 transition-colors"
        >
          Add
        </button>
      </div>
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selected.map(ticker => (
            <span
              key={ticker}
              className="inline-flex items-center gap-2 bg-dark-card border border-dark-border rounded px-3 py-1 text-sm"
            >
              {ticker}
              <button
                onClick={() => handleRemove(ticker)}
                className="text-dark-text-muted hover:text-dark-text-primary"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}
      <div className="text-sm text-dark-text-secondary">
        Popular: {POPULAR_TICKERS.map(t => (
          <button
            key={t}
            onClick={() => !selected.includes(t) && onSelect([...selected, t])}
            className="mr-2 hover:text-dark-accent-blue"
          >
            {t}
          </button>
        ))}
      </div>
    </div>
  )
}
