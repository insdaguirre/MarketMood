import { AskResponse } from '../../lib/api'
import CitationList from './CitationList'

interface AnswerDisplayProps {
  response: AskResponse
}

export default function AnswerDisplay({ response }: AnswerDisplayProps) {
  return (
    <div className="space-y-4">
      <div className="bg-dark-card rounded-lg p-6 border border-dark-border">
        <h3 className="text-lg font-semibold text-dark-text-primary mb-4">Answer</h3>
        <div className="prose prose-invert max-w-none">
          <p className="text-dark-text-primary whitespace-pre-wrap">{response.answer}</p>
        </div>
        <div className="mt-4 pt-4 border-t border-dark-border text-sm text-dark-text-secondary">
          Retrieved {response.retrieved} results in {response.latencyMs}ms
        </div>
      </div>
      {response.citations.length > 0 && (
        <CitationList citations={response.citations} />
      )}
    </div>
  )
}
