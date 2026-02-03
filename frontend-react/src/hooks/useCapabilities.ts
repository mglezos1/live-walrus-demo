import { useState } from 'react'

const BACKEND_URL = 'http://localhost:3000'

export interface Capability {
  id: string
  dataset_id_hash: string
  query_type: string
  query_params: Record<string, any>
  expires_at: number
  issuer: string
  issued_at: number
  signature?: string
}

export function useCapabilities() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const issueCapability = async (capabilityData: {
    dataset_id_hash: string
    query_type: string
    query_params: Record<string, any>
    expires_at?: number
  }) => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch(`${BACKEND_URL}/capabilities/issue`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(capabilityData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to issue capability')
      }

      const data = await response.json()
      return data
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to issue capability'
      setError(errorMessage)
      throw err
    } finally {
      setLoading(false)
    }
  }

  const getCapabilities = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch(`${BACKEND_URL}/capabilities`)
      if (!response.ok) {
        throw new Error('Failed to load capabilities')
      }
      const data = await response.json()
      return data.capabilities || []
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load capabilities'
      setError(errorMessage)
      throw err
    } finally {
      setLoading(false)
    }
  }

  return {
    issueCapability,
    getCapabilities,
    loading,
    error,
  }
}
