import { useQuery } from '@tanstack/react-query'
import { apiClient, StatsResponse } from '../../lib/api'

function formatTimeAgo(dateString: string | null): string {
  if (!dateString) return 'Never'
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  
  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `${diffHours}h ago`
  const diffDays = Math.floor(diffHours / 24)
  return `${diffDays}d ago`
}

function formatTimeUntil(dateString: string | null): string {
  if (!dateString) return 'N/A'
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = date.getTime() - now.getTime()
  
  if (diffMs < 0) return 'Overdue'
  
  const diffMins = Math.floor(diffMs / 60000)
  if (diffMins < 1) return 'Now'
  if (diffMins < 60) return `in ${diffMins}m`
  const diffHours = Math.floor(diffMins / 60)
  return `in ${diffHours}h`
}

function getSourceColor(source: string): string {
  const colors: Record<string, string> = {
    finnhub: 'text-blue-400',
    reddit: 'text-orange-400',
    newsapi: 'text-green-400',
    stocktwits: 'text-purple-400',
  }
  return colors[source] || 'text-gray-400'
}

function getSourceIcon(source: string): string {
  const icons: Record<string, string> = {
    finnhub: '📰',
    reddit: '💬',
    newsapi: '📰',
    stocktwits: '💹',
  }
  return icons[source] || '📊'
}

export default function IngestionStats() {
  const { data: stats, isLoading } = useQuery<StatsResponse>({
    queryKey: ['stats'],
    queryFn: () => apiClient.getStats(),
    refetchInterval: 30000, // Poll every 30 seconds
  })

  if (isLoading) {
    return (
      <div className="bg-dark-card rounded-lg p-6 border border-dark-border">
        <h3 className="text-lg font-semibold text-dark-text-primary mb-4">Ingestion Stats</h3>
        <div className="text-dark-text-secondary">Loading...</div>
      </div>
    )
  }

  if (!stats) {
    return null
  }

  const sources = [
    { key: 'finnhub', label: 'Finnhub', data: stats.sources.finnhub },
    { key: 'reddit', label: 'Reddit', data: stats.sources.reddit },
    { key: 'newsapi', label: 'NewsAPI', data: stats.sources.newsapi },
    { key: 'stocktwits', label: 'Stocktwits', data: stats.sources.stocktwits },
  ]

  return (
    <div className="bg-dark-card rounded-lg p-6 border border-dark-border mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-dark-text-primary">Ingestion Stats</h3>
        <div className="text-sm text-dark-text-secondary">
          Total: <span className="font-medium text-dark-text-primary">{stats.totalSnapshots}</span> snapshots
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {sources.map(({ key, label, data }) => (
          <div key={key} className="bg-dark-surface rounded-lg p-4 border border-dark-border">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xl">{getSourceIcon(key)}</span>
              <span className={`font-medium capitalize ${getSourceColor(key)}`}>{label}</span>
            </div>
            
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-dark-text-secondary">Data:</span>
                <span className="font-medium text-dark-text-primary">{data.count}</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-dark-text-secondary">Last:</span>
                <span className="text-dark-text-primary text-xs">{formatTimeAgo(data.lastQuery)}</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-dark-text-secondary">Next:</span>
                <span className={`text-xs ${data.nextQuery && new Date(data.nextQuery).getTime() > Date.now() ? 'text-dark-accent-green' : 'text-dark-text-secondary'}`}>
                  {formatTimeUntil(data.nextQuery)}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

