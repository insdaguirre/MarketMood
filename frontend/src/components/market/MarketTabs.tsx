import { useState } from 'react'

const TABS = ['US', 'Europe', 'Asia', 'Currencies', 'Crypto', 'Futures']

export default function MarketTabs() {
  const [activeTab, setActiveTab] = useState('US')

  return (
    <div className="flex gap-1 mb-6 border-b border-dark-border">
      {TABS.map(tab => (
        <button
          key={tab}
          onClick={() => setActiveTab(tab)}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === tab
              ? 'border-dark-accent-blue text-dark-accent-blue'
              : 'border-transparent text-dark-text-secondary hover:text-dark-text-primary'
          }`}
        >
          {tab}
        </button>
      ))}
    </div>
  )
}
