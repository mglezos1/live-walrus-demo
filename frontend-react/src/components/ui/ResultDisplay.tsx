import { ReactNode } from 'react'

interface ResultDisplayProps {
  children?: ReactNode
  message?: string
  type?: 'success' | 'error' | 'info'
}

export function ResultDisplay({ children, message, type = 'info' }: ResultDisplayProps) {
  const typeClasses = {
    success: 'bg-green-50 border-green-200 text-green-800',
    error: 'bg-red-50 border-red-200 text-red-800',
    info: 'bg-blue-50 border-blue-200 text-blue-800'
  }
  
  const content = message || children
  
  return (
    <div className={`p-4 rounded-lg border ${typeClasses[type]} whitespace-pre-wrap font-mono text-sm`}>
      {content}
    </div>
  )
}
