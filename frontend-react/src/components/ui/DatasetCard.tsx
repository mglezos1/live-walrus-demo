import { Database } from 'lucide-react'

interface Dataset {
  blobId?: string
  datasetHash?: string
  timestamp?: number
}

interface DatasetCardProps {
  dataset?: Dataset
  blobId?: string
  datasetHash?: string
  timestamp?: number
  onClick?: () => void
}

export function DatasetCard({ dataset, blobId, datasetHash, timestamp, onClick }: DatasetCardProps) {
  const data = dataset || { blobId, datasetHash, timestamp }
  const date = data.timestamp ? new Date(data.timestamp).toLocaleString() : 'Unknown date'
  
  return (
    <div 
      className="bg-white border border-gray-200 rounded-lg p-4 flex gap-4 cursor-pointer transition-all hover:shadow-md hover:-translate-y-0.5"
      onClick={onClick}
    >
      <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center text-blue-600 flex-shrink-0">
        <Database size={24} />
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Dataset</h3>
        {data.blobId && (
          <p className="text-sm text-gray-600 font-mono mb-1 truncate">
            Blob ID: {data.blobId.slice(0, 16)}...
          </p>
        )}
        {data.datasetHash && (
          <p className="text-sm text-gray-600 font-mono mb-1 truncate">
            Hash: {data.datasetHash.slice(0, 16)}...
          </p>
        )}
        <p className="text-xs text-gray-500 mt-2">{date}</p>
      </div>
    </div>
  )
}
