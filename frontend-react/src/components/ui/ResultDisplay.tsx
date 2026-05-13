import { ReactNode } from 'react'

interface ResultDisplayProps {
  children?: ReactNode
  message?: string
  type?: 'success' | 'error' | 'info'
}

// Helper function to convert text with URLs into clickable links
function renderMessageWithLinks(text: string) {
  // URL regex pattern - matches http://, https://, or www. URLs
  const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+)/g;
  
  const parts = text.split(urlRegex);
  
  return parts.map((part, index) => {
    if (urlRegex.test(part)) {
      // Ensure URL has protocol
      const url = part.startsWith('http') ? part : `https://${part}`;
      return (
        <a
          key={index}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:text-blue-800 underline break-all"
        >
          {part}
        </a>
      );
    }
    return <span key={index}>{part}</span>;
  });
}

export function ResultDisplay({ children, message, type = 'info' }: ResultDisplayProps) {
  const typeClasses = {
    success: 'bg-green-50 border-green-200 text-green-800',
    error: 'bg-red-50 border-red-200 text-red-800',
    info: 'bg-blue-50 border-blue-200 text-blue-800'
  }
  
  const content = message ? renderMessageWithLinks(message) : children
  
  return (
    <div className={`p-4 rounded-lg border ${typeClasses[type]} whitespace-pre-wrap font-mono text-sm`}>
      {content}
    </div>
  )
}
