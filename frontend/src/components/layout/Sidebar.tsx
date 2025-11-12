import { useState } from 'react'
import { Link } from 'react-router-dom'

const EQUITY_SECTORS = [
  { name: 'Materials', symbol: 'SIXB', value: 936.10, change: 0.71, positive: true },
  { name: 'Communications', symbol: 'SIXC', value: 592.84, change: -0.56, positive: false },
  { name: 'Energy', symbol: 'SIXE', value: 948.66, change: -1.42, positive: false },
  { name: 'Industrials', symbol: 'SIXI', value: 1556.14, change: 0.09, positive: true },
  { name: 'Financials', symbol: 'SIXM', value: 660.99, change: 0.90, positive: true },
  { name: 'Staples', symbol: 'SIXR', value: 779.98, change: -0.20, positive: false },
  { name: 'Real Estate', symbol: 'SIXRE', value: 202.91, change: -0.76, positive: false },
  { name: 'Technology', symbol: 'SIXT', value: 2959.71, change: 0.35, positive: true },
  { name: 'Utilities', symbol: 'SIXU', value: 908.99, change: 0.23, positive: true },
  { name: 'Health Care', symbol: 'SIXV', value: 1542.54, change: 1.36, positive: true },
]

export default function Sidebar() {
  const [watchlist] = useState<string[]>([])

  return (
    <aside className="w-64 bg-dark-surface border-r border-dark-border p-4 overflow-y-auto">
      <div className="mb-6">
        <h2 className="text-sm font-semibold text-dark-text-secondary mb-2">Watchlist</h2>
        {watchlist.length === 0 ? (
          <p className="text-sm text-dark-text-muted">No tickers in watchlist</p>
        ) : (
          <ul className="space-y-1">
            {watchlist.map(ticker => (
              <li key={ticker}>
                <Link to={`/ticker/${ticker}`} className="text-sm text-dark-text-primary hover:text-dark-accent-blue">
                  {ticker}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <h2 className="text-sm font-semibold text-dark-text-secondary mb-2">Equity Sectors</h2>
        <ul className="space-y-2">
          {EQUITY_SECTORS.map(sector => (
            <li key={sector.symbol} className="flex items-center justify-between text-sm">
              <div className="flex-1">
                <div className="text-dark-text-primary">{sector.symbol}</div>
                <div className="text-xs text-dark-text-muted">{sector.name}</div>
              </div>
              <div className="text-right">
                <div className="text-dark-text-primary">{sector.value.toLocaleString()}</div>
                <div className={`text-xs ${sector.positive ? 'text-dark-accent-green' : 'text-dark-accent-red'}`}>
                  {sector.positive ? '+' : ''}{sector.change}%
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  )
}
