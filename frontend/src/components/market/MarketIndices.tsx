interface Index {
  name: string
  value: number
  change: number
  changePercent: number
  positive: boolean
}

const INDICES: Index[] = [
  { name: 'Dow Jones', value: 48254.82, change: 326.86, changePercent: 0.68, positive: true },
  { name: 'S&P 500', value: 6850.92, change: 4.31, changePercent: 0.06, positive: true },
  { name: 'Nasdaq', value: 23406.46, change: -61.84, changePercent: -0.26, positive: false },
  { name: 'Russell', value: 2450.80, change: -7.48, changePercent: -0.30, positive: false },
  { name: 'VIX', value: 17.51, change: 0.23, changePercent: 1.33, positive: true },
]

export default function MarketIndices() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
      {INDICES.map(index => (
        <div key={index.name} className="bg-dark-card rounded-lg p-4 border border-dark-border">
          <div className="text-sm text-dark-text-secondary mb-1">{index.name}</div>
          <div className="text-xl font-semibold text-dark-text-primary mb-1">
            {index.value.toLocaleString(undefined, { maximumFractionDigits: 2 })}
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-sm font-medium ${index.positive ? 'text-dark-accent-green' : 'text-dark-accent-red'}`}>
              {index.positive ? '+' : ''}{index.change.toFixed(2)}
            </span>
            <span className={`text-sm ${index.positive ? 'text-dark-accent-green' : 'text-dark-accent-red'}`}>
              ({index.positive ? '+' : ''}{index.changePercent.toFixed(2)}%)
            </span>
          </div>
        </div>
      ))}
    </div>
  )
}
