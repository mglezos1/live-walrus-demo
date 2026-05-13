import { useState, useEffect } from 'react'

import { getBackendUrl } from '../lib/backendUrl'

const BACKEND_URL = getBackendUrl()

export interface Dataset {
  blob_id: string
  dataset_hash: string
  timestamp: number
}

export function useDatasets() {
  const [datasets, setDatasets] = useState<Dataset[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadDatasets = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch(`${BACKEND_URL}/datasets`)
      if (!response.ok) {
        throw new Error('Failed to load datasets')
      }
      const data = await response.json()
      setDatasets(data.datasets || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  const uploadDataset = async (file: File) => {
    setLoading(true)
    setError(null)
    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch(`${BACKEND_URL}/datasets/upload`, {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Upload failed')
      }

      const data = await response.json()
      await loadDatasets() // Reload datasets after upload
      return data
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Upload failed'
      setError(errorMessage)
      throw err
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadDatasets()
  }, [])

  return {
    datasets,
    loading,
    error,
    uploadDataset,
    loadDatasets,
  }
}
