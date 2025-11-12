import MarketIndices from '../components/market/MarketIndices'
import TickerSelector from '../components/sentiment/TickerSelector'
import SentimentChart from '../components/sentiment/SentimentChart'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { apiClient } from '../lib/api'
import { Link } from 'react-router-dom'

export default function Dashboard() {
  const [selectedTicker, setSelectedTicker] = useState('AAPL')
  const { data: sentimentData, isLoading } = useQuery({
    queryKey: ['sentiment', selectedTicker],
    queryFn: () => apiClient.getSentiment(selectedTicker),
    enabled: !!selectedTicker,
    refetchInterval: 60000, // Refetch every minute
  })

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <MarketIndices />

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
            <div className="bg-dark-card rounded-lg p-8 border border-dark-border text-center text-dark-text-secondary">
              Loading sentiment data...
            </div>
          ) : sentimentData ? (
            <div className="space-y-4">
              {['news', 'reddit', 'stocktwits', 'finnhub'].map(source => {
                const sourceData = sentimentData.snapshots.filter(s => s.source === source)
                if (sourceData.length === 0) return null
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
              <div className="space-y-2 text-sm">
                {sentimentData.snapshots.slice(0, 5).map((snapshot, idx) => (
                  <div key={idx} className="flex justify-between items-center">
                    <span className="text-dark-text-secondary capitalize">{snapshot.source}</span>
                    <span className={`font-medium ${snapshot.mean > 0 ? 'text-dark-accent-green' : snapshot.mean < 0 ? 'text-dark-accent-red' : 'text-dark-text-secondary'}`}>
                      {snapshot.mean > 0 ? '+' : ''}{(snapshot.mean * 100).toFixed(1)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
