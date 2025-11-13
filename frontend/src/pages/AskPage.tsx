import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { apiClient, AskRequest } from '../lib/api'
import AskInput from '../components/qa/AskInput'
import AnswerDisplay from '../components/qa/AnswerDisplay'

export default function AskPage() {
  const [query, setQuery] = useState('')
  const [tickers, setTickers] = useState<string[]>([])
  const [shouldFetch, setShouldFetch] = useState(false)

  const { data: answerData, isLoading } = useQuery({
    queryKey: ['ask', query, tickers],
    queryFn: () => apiClient.ask({ query, tickers } as AskRequest),
    enabled: shouldFetch && query.trim().length > 0 && tickers.length > 0,
  })

  const handleSubmit = (q: string, t: string[]) => {
    // Only trigger query when explicitly submitted via "Ask" button or Enter key
    setQuery(q)
    setTickers(t)
    setShouldFetch(true)
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold text-dark-text-primary mb-6">Ask MarketMood</h1>
      
      <div className="bg-dark-card rounded-lg p-6 border border-dark-border mb-6">
        <AskInput onSubmit={handleSubmit} isLoading={isLoading} />
      </div>

      {isLoading && (
        <div className="bg-dark-card rounded-lg p-8 border border-dark-border text-center text-dark-text-secondary">
          Analyzing sentiment and generating answer...
        </div>
      )}

      {answerData && <AnswerDisplay response={answerData} />}
    </div>
  )
}
