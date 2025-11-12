import { Link } from 'react-router-dom'

export default function Header() {
  return (
    <header className="bg-dark-surface border-b border-dark-border px-6 py-4 flex items-center justify-between">
      <div className="flex items-center gap-6">
        <Link to="/" className="text-xl font-semibold text-dark-text-primary hover:text-dark-accent-blue">
          MarketMood
        </Link>
        <nav className="flex gap-4">
          <Link to="/" className="text-dark-text-secondary hover:text-dark-text-primary">
            Dashboard
          </Link>
          <Link to="/ask" className="text-dark-text-secondary hover:text-dark-text-primary">
            Ask
          </Link>
        </nav>
      </div>
      <div className="flex items-center gap-4">
        <button className="p-2 rounded hover:bg-dark-card">
          <svg className="w-5 h-5 text-dark-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </button>
        <button className="p-2 rounded hover:bg-dark-card">
          <svg className="w-5 h-5 text-dark-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        </button>
      </div>
    </header>
  )
}
