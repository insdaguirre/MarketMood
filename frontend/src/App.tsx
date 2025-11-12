import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Dashboard from './pages/Dashboard'
import TickerDetail from './pages/TickerDetail'
import AskPage from './pages/AskPage'
import Layout from './components/layout/Layout'

function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/ticker/:ticker" element={<TickerDetail />} />
          <Route path="/ask" element={<AskPage />} />
        </Routes>
      </Layout>
    </Router>
  )
}

export default App
