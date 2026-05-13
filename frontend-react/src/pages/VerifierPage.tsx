import { useState } from 'react'
import { Layout } from '../components/layout/Layout'
import { Container } from '../components/layout/Container'
import { Button } from '../components/ui/Button'
import { ResultDisplay } from '../components/ui/ResultDisplay'
import { LoadingSpinner } from '../components/ui/LoadingSpinner'
import { Shield } from 'lucide-react'

import { getBackendUrl } from '../lib/backendUrl'
import { apiFetch } from '../lib/apiFetch'

const BACKEND_URL = getBackendUrl()

export function VerifierPage() {
  const [proofId, setProofId] = useState('')
  const [blobId, setBlobId] = useState('')
  const [result, setResult] = useState<string>('')
  const [loading, setLoading] = useState(false)

  const verifyProof = async () => {
    if (!proofId) {
      setResult('Please provide a proof ID')
      return
    }

    setLoading(true)
    setResult('Verifying proof...')

    try {
      const response = await apiFetch(`${BACKEND_URL}/verifier/proofs/${proofId}`)
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Verification failed')
      }

      const data = await response.json()
      
      if (data.error) {
        setResult(`❌ ${data.error}\n\n${data.message || ''}\n\n${data.help || ''}`)
      } else if (data.proof_result) {
        setResult(`✅ Proof Verified!\n\nProof ID: ${data.proof_result.proof_id}\nBlob ID: ${data.proof_result.blob_id}\nPublic Output: ${data.proof_result.public_output}\nVerified At: ${new Date(data.proof_result.verified_at).toLocaleString()}\n\nFull Result:\n${JSON.stringify(data, null, 2)}`)
      } else {
        setResult(`Verification Result:\n\n${JSON.stringify(data, null, 2)}`)
      }
    } catch (err) {
      setResult(`❌ Error: ${err instanceof Error ? err.message : 'Unknown error'}`)
    } finally {
      setLoading(false)
    }
  }

  const listProofs = async () => {
    if (!blobId) {
      setResult('Please provide a blob ID')
      return
    }

    setLoading(true)
    setResult('Loading proofs...')

    try {
      const response = await apiFetch(`${BACKEND_URL}/verifier/datasets/${blobId}/proofs`)
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to load proofs')
      }

      const data = await response.json()
      
      if (data.error) {
        setResult(`❌ ${data.error}\n\n${data.message || ''}`)
      } else if (data.proofs && data.proofs.length > 0) {
        setResult(`Found ${data.proofs.length} proof(s):\n\n${JSON.stringify(data, null, 2)}`)
      } else {
        setResult(`ℹ️ ${data.message || 'No proofs found for this dataset'}\n\n${JSON.stringify(data, null, 2)}`)
      }
    } catch (err) {
      setResult(`❌ Error: ${err instanceof Error ? err.message : 'Unknown error'}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Layout gradient="verifier">
      <Container>
        <div className="page-header">
          <Shield size={32} />
          <h1>Verifier Portal</h1>
          <p>Query and verify proof results on the blockchain</p>
        </div>

        <div className="form-section">
          <div className="form-group">
            <label>Proof ID</label>
            <input
              type="text"
              value={proofId}
              onChange={(e) => setProofId(e.target.value)}
              placeholder="Enter proof ID to verify"
              className="input"
            />
            <Button onClick={verifyProof} disabled={loading || !proofId}>
              {loading ? <LoadingSpinner size="small" /> : 'Verify Proof'}
            </Button>
          </div>

          <div className="form-group">
            <label>Blob ID (to list proofs)</label>
            <input
              type="text"
              value={blobId}
              onChange={(e) => setBlobId(e.target.value)}
              placeholder="Enter blob ID to list proofs"
              className="input"
            />
            <Button onClick={listProofs} disabled={loading || !blobId}>
              {loading ? <LoadingSpinner size="small" /> : 'List Proofs'}
            </Button>
          </div>

          {result && (
            <ResultDisplay 
              message={result}
              type={result.startsWith('❌') ? 'error' : result.startsWith('✅') ? 'success' : 'info'}
            />
          )}
        </div>
      </Container>
    </Layout>
  )
}
