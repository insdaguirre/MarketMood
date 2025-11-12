import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

interface SentimentData {
  ts: string
  mean: number
  pos: number
  neg: number
  neu: number
}

interface SentimentChartProps {
  data: SentimentData[]
  source?: string
}

export default function SentimentChart({ data, source }: SentimentChartProps) {
  if (data.length === 0) {
    return (
      <div className="bg-dark-card rounded-lg p-8 border border-dark-border text-center text-dark-text-secondary">
        No sentiment data available
      </div>
    )
  }

  const chartData = data.map(item => ({
    time: new Date(item.ts).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
    mean: (item.mean * 100).toFixed(1),
    positive: (item.pos * 100).toFixed(1),
    negative: (item.neg * 100).toFixed(1),
    neutral: (item.neu * 100).toFixed(1),
  }))

  return (
    <div className="bg-dark-card rounded-lg p-4 border border-dark-border">
      {source && (
        <h3 className="text-lg font-semibold text-dark-text-primary mb-4 capitalize">{source} Sentiment</h3>
      )}
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#2d2d2d" />
          <XAxis dataKey="time" stroke="#9aa0a6" />
          <YAxis stroke="#9aa0a6" />
          <Tooltip
            contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #2d2d2d', borderRadius: '4px' }}
            labelStyle={{ color: '#e8eaed' }}
          />
          <Legend />
          <Line type="monotone" dataKey="mean" stroke="#4285f4" name="Mean Sentiment" />
          <Line type="monotone" dataKey="positive" stroke="#34a853" name="Positive %" />
          <Line type="monotone" dataKey="negative" stroke="#ea4335" name="Negative %" />
          <Line type="monotone" dataKey="neutral" stroke="#9aa0a6" name="Neutral %" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
