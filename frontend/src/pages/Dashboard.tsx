import MarketIndices from '../components/market/MarketIndices'
import TickerSelector from '../components/sentiment/TickerSelector'
import SentimentChart from '../components/sentiment/SentimentChart'
import IngestionStats from '../components/stats/IngestionStats'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { apiClient } from '../lib/api'
import { Link } from 'react-router-dom'

export default function Dashboard() {
  const [selectedTicker, setSelectedTicker] = useState('AAPL')
  const { data: sentimentData, isLoading } = useQuery({
    queryKey: ['sentiment', selectedTicker],
    queryFn: () => apiClient.getSentiment(selectedTicker, 10080), // 7 days instead of default 24 hours
    enabled: !!selectedTicker,
    refetchInterval: 60000, // Refetch every minute
  })

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <MarketIndices />
      
      <IngestionStats />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="mb-4">
            <h2 className="text-xl font-semibold text-dark-text-primary mb-4">Sentiment Analysis</h2>
            <TickerSelector
              selected={selectedTicker ? [selectedTicker] : []}
              onSelect={(tickers) => setSelectedTicker(tickers[0] || '')}
            />
          </div>
          {isLoading ? (
            <div className="space-y-4">
              {['finnhub', 'reddit', 'newsapi', 'stocktwits'].map(source => (
                <div key={source} className="bg-dark-card rounded-lg p-8 border border-dark-border">
                  <div className="animate-pulse">
                    <div className="h-6 bg-dark-surface rounded w-32 mb-4"></div>
                    <div className="h-64 bg-dark-surface rounded"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : sentimentData ? (
            <div className="space-y-4">
              {['finnhub', 'reddit', 'newsapi', 'stocktwits'].map(source => {
                const sourceData = sentimentData.snapshots.filter(s => s.source === source)
                if (sourceData.length === 0) {
                  return (
                    <div key={source} className="bg-dark-card rounded-lg p-8 border border-dark-border">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xl">
                          {source === 'finnhub' ? '📰' : source === 'reddit' ? '💬' : source === 'newsapi' ? '📰' : '💹'}
                        </span>
                        <h3 className="text-lg font-semibold text-dark-text-primary capitalize">{source} Sentiment</h3>
                      </div>
                      <div className="text-center text-dark-text-secondary py-8">
                        No data available for this source
                      </div>
                    </div>
                  )
                }
                return <SentimentChart key={source} data={sourceData} source={source} />
              })}
            </div>
          ) : (
            <div className="bg-dark-card rounded-lg p-8 border border-dark-border text-center text-dark-text-secondary">
              Select a ticker to view sentiment
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="bg-dark-card rounded-lg p-6 border border-dark-border">
            <h3 className="text-lg font-semibold text-dark-text-primary mb-4">Quick Actions</h3>
            <Link
              to="/ask"
              className="block w-full px-4 py-3 bg-dark-accent-blue text-white rounded hover:bg-blue-600 transition-colors text-center"
            >
              Ask a Question
            </Link>
          </div>

          {sentimentData && (
            <div className="bg-dark-card rounded-lg p-6 border border-dark-border">
              <h3 className="text-lg font-semibold text-dark-text-primary mb-4">Latest Summary</h3>
              <div className="space-y-3">
                {['finnhub', 'reddit', 'newsapi', 'stocktwits'].map(source => {
                  const sourceSnapshots = sentimentData.snapshots.filter(s => s.source === source)
                  if (sourceSnapshots.length === 0) {
                    return (
                      <div key={source} className="flex items-center justify-between py-2 border-b border-dark-border last:border-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm">
                            {source === 'finnhub' ? '📰' : source === 'reddit' ? '💬' : source === 'newsapi' ? '📰' : '💹'}
                          </span>
                          <span className="text-sm text-dark-text-secondary capitalize">{source}</span>
                        </div>
                        <span className="text-xs text-dark-text-muted">No data</span>
                      </div>
                    )
                  }
                  const latest = sourceSnapshots[0]
                  const previous = sourceSnapshots[1]
                  const trend = previous ? (latest.mean - previous.mean) : 0
                  return (
                    <div key={source} className="flex items-center justify-between py-2 border-b border-dark-border last:border-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm">
                          {source === 'finnhub' ? '📰' : source === 'reddit' ? '💬' : source === 'newsapi' ? '📰' : '💹'}
                        </span>
                        <div>
                          <div className="text-sm font-medium text-dark-text-primary capitalize">{source}</div>
                          <div className="text-xs text-dark-text-muted">
                            {new Date(latest.ts).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`text-sm font-medium ${latest.mean > 0 ? 'text-dark-accent-green' : latest.mean < 0 ? 'text-dark-accent-red' : 'text-dark-text-secondary'}`}>
                          {latest.mean > 0 ? '+' : ''}{(latest.mean * 100).toFixed(1)}%
                        </div>
                        {trend !== 0 && (
                          <div className={`text-xs ${trend > 0 ? 'text-dark-accent-green' : 'text-dark-accent-red'}`}>
                            {trend > 0 ? '↑' : '↓'} {Math.abs(trend * 100).toFixed(1)}%
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
