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

function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
}

function formatDateTime(date: Date): string {
  return date.toLocaleString('en-US', { 
    month: 'short', 
    day: 'numeric', 
    hour: '2-digit', 
    minute: '2-digit' 
  })
}

export default function SentimentChart({ data, source }: SentimentChartProps) {
  if (data.length === 0) {
    return (
      <div className="bg-dark-card rounded-lg p-8 border border-dark-border text-center text-dark-text-secondary">
        No sentiment data available
      </div>
    )
  }

  // If only one data point, show as metric cards
  if (data.length === 1) {
    const item = data[0]
    const date = new Date(item.ts)
    
    return (
      <div className="bg-dark-card rounded-lg p-6 border border-dark-border">
        {source && (
          <h3 className="text-lg font-semibold text-dark-text-primary mb-4 capitalize">{source} Sentiment</h3>
        )}
        <div className="text-xs text-dark-text-secondary mb-4">
          Last updated: {formatDateTime(date)}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-dark-surface rounded-lg p-4 border border-dark-border">
            <div className="text-sm text-dark-text-secondary mb-1">Mean</div>
            <div className={`text-2xl font-bold ${item.mean > 0 ? 'text-dark-accent-green' : item.mean < 0 ? 'text-dark-accent-red' : 'text-dark-text-primary'}`}>
              {item.mean > 0 ? '+' : ''}{(item.mean * 100).toFixed(1)}%
            </div>
          </div>
          <div className="bg-dark-surface rounded-lg p-4 border border-dark-border">
            <div className="text-sm text-dark-text-secondary mb-1">Positive</div>
            <div className="text-2xl font-bold text-dark-accent-green">
              {(item.pos * 100).toFixed(1)}%
            </div>
          </div>
          <div className="bg-dark-surface rounded-lg p-4 border border-dark-border">
            <div className="text-sm text-dark-text-secondary mb-1">Negative</div>
            <div className="text-2xl font-bold text-dark-accent-red">
              {(item.neg * 100).toFixed(1)}%
            </div>
          </div>
          <div className="bg-dark-surface rounded-lg p-4 border border-dark-border">
            <div className="text-sm text-dark-text-secondary mb-1">Neutral</div>
            <div className="text-2xl font-bold text-dark-text-primary">
              {(item.neu * 100).toFixed(1)}%
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Group by hour if we have multiple data points
  const chartData = data
    .map(item => ({
      time: new Date(item.ts),
      mean: item.mean * 100,
      positive: item.pos * 100,
      negative: item.neg * 100,
      neutral: item.neu * 100,
    }))
    .sort((a, b) => a.time.getTime() - b.time.getTime())
    .map(item => ({
      time: formatTime(item.time),
      fullTime: formatDateTime(item.time),
      mean: Number(item.mean.toFixed(1)),
      positive: Number(item.positive.toFixed(1)),
      negative: Number(item.negative.toFixed(1)),
      neutral: Number(item.neu.toFixed(1)),
    }))

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-dark-surface border border-dark-border rounded-lg p-3 shadow-lg">
          <p className="text-dark-text-primary font-medium mb-2">{data.fullTime || label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color }} className="text-sm">
              {entry.name}: {entry.value}%
            </p>
          ))}
        </div>
      )
    }
    return null
  }

  return (
    <div className="bg-dark-card rounded-lg p-4 border border-dark-border">
      {source && (
        <h3 className="text-lg font-semibold text-dark-text-primary mb-4 capitalize">{source} Sentiment</h3>
      )}
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#2d2d2d" />
          <XAxis 
            dataKey="time" 
            stroke="#9aa0a6" 
            tick={{ fill: '#9aa0a6', fontSize: 12 }}
          />
          <YAxis 
            stroke="#9aa0a6" 
            domain={[0, 100]}
            tick={{ fill: '#9aa0a6', fontSize: 12 }}
            label={{ value: '%', angle: -90, position: 'insideLeft', fill: '#9aa0a6' }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend wrapperStyle={{ color: '#9aa0a6' }} />
          <Line 
            type="monotone" 
            dataKey="mean" 
            stroke="#4285f4" 
            name="Mean Sentiment" 
            strokeWidth={2}
            dot={{ r: 4 }}
            activeDot={{ r: 6 }}
          />
          <Line 
            type="monotone" 
            dataKey="positive" 
            stroke="#34a853" 
            name="Positive %" 
            strokeWidth={2}
            dot={{ r: 4 }}
            activeDot={{ r: 6 }}
          />
          <Line 
            type="monotone" 
            dataKey="negative" 
            stroke="#ea4335" 
            name="Negative %" 
            strokeWidth={2}
            dot={{ r: 4 }}
            activeDot={{ r: 6 }}
          />
          <Line 
            type="monotone" 
            dataKey="neutral" 
            stroke="#9aa0a6" 
            name="Neutral %" 
            strokeWidth={2}
            dot={{ r: 4 }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
