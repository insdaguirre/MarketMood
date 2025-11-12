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
    </header>
  )
}
