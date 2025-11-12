import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { apiClient } from '../lib/api'
import SentimentChart from '../components/sentiment/SentimentChart'

export default function TickerDetail() {
  const { ticker } = useParams<{ ticker: string }>()
  const { data: sentimentData, isLoading } = useQuery({
    queryKey: ['sentiment', ticker],
    queryFn: () => apiClient.getSentiment(ticker!),
    enabled: !!ticker,
    refetchInterval: 60000,
  })

  if (!ticker) {
    return (
      <div className="p-6">
        <div className="bg-dark-card rounded-lg p-8 border border-dark-border text-center">
          <p className="text-dark-text-secondary">Invalid ticker</p>
          <Link to="/" className="text-dark-accent-blue hover:underline mt-4 inline-block">
            Back to Dashboard
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <Link to="/" className="text-dark-accent-blue hover:underline mb-2 inline-block">
          ← Back to Dashboard
        </Link>
        <h1 className="text-3xl font-bold text-dark-text-primary">{ticker}</h1>
      </div>

      {isLoading ? (
        <div className="bg-dark-card rounded-lg p-8 border border-dark-border text-center text-dark-text-secondary">
          Loading sentiment data...
        </div>
      ) : sentimentData ? (
        <div className="space-y-6">
          {['news', 'reddit', 'stocktwits', 'finnhub'].map(source => {
            const sourceData = sentimentData.snapshots.filter(s => s.source === source)
            if (sourceData.length === 0) return null
            return <SentimentChart key={source} data={sourceData} source={source} />
          })}
        </div>
      ) : (
        <div className="bg-dark-card rounded-lg p-8 border border-dark-border text-center text-dark-text-secondary">
          No sentiment data available for {ticker}
        </div>
      )}
    </div>
  )
}
