import { useState } from 'react';
import { Layout } from '../components/layout/Layout';
import { Container } from '../components/layout/Container';
import { Button } from '../components/ui/Button';
import { Textarea } from '../components/ui/Textarea';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { ResultDisplay } from '../components/ui/ResultDisplay';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { motion } from 'framer-motion';
import { FlaskConical } from 'lucide-react';

import { getBackendUrl } from '../lib/backendUrl';

const BACKEND_URL = getBackendUrl();

export function ResearcherPage() {
  const [capability, setCapability] = useState('');
  const [blobId, setBlobId] = useState('');
  const [proofType, setProofType] = useState('count_aggregate');
  const [result, setResult] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [loading, setLoading] = useState(false);
  const [generatedProof, setGeneratedProof] = useState<any>(null);

  const generateProof = async () => {
    if (!capability || !blobId) {
      setResult({
        message: 'Please provide both capability token and blob ID',
        type: 'error',
      });
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const response = await fetch(`${BACKEND_URL}/proofs/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          capability_id: capability,
          blob_id: blobId,
          proof_type: proofType,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Proof generation failed');
      }

      const data = await response.json();
      
      if (data.success) {
        // Store proof data for submission
        setGeneratedProof(data);
        setResult({
          message: `✅ Proof generated successfully!\n\nProof ID: ${data.proof_id}\nBlob ID: ${data.blob_id}\nCount: ${data.count || data.public_output}\n\nClick "Submit Proof to Blockchain" below to store it on-chain.`,
          type: 'success',
        });
      } else {
        throw new Error(data.error || 'Proof generation failed');
      }
    } catch (err) {
      setResult({
        message: `❌ Error: ${err instanceof Error ? err.message : 'Unknown error'}`,
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  // Map proof_type to circuit_id for submission
  const getCircuitId = (proofType: string): string => {
    const mapping: Record<string, string> = {
      'count_aggregate': 'aggregate_count',
      'sum_aggregate': 'aggregate_sum',
      'range_query': 'range_count',
      'condition_query': 'condition_count',
    };
    return mapping[proofType] || 'aggregate_count';
  };

  const submitProof = async () => {
    if (!generatedProof) {
      setResult({
        message: 'Please generate a proof first',
        type: 'error',
      });
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const response = await fetch(`${BACKEND_URL}/proofs/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          proof_id: generatedProof.proof_id,
          blob_id: generatedProof.blob_id,
          proof: generatedProof.proof,
          public_signals: generatedProof.public_signals,
          circuit_id: getCircuitId(proofType),
          public_output: generatedProof.public_output,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Proof submission failed');
      }

      const data = await response.json();
      
      if (data.success) {
        const transactionDigest = data.transaction_digest || data.transactionDigest || data.digest;
        const explorerUrl = transactionDigest ? `https://suiscan.xyz/testnet/tx/${transactionDigest}` : '';
        
        setResult({
          message: `✅ Proof submitted to blockchain!\n\nTransaction Digest: ${transactionDigest || 'Loading...'}\n${explorerUrl ? `View on Sui Explorer: ${explorerUrl}\n` : ''}Proof ID: ${data.proof_id}\n\nYou can now verify this proof in the Verifier portal.`,
          type: 'success',
        });
        setGeneratedProof(null); // Clear after successful submission
      } else {
        throw new Error(data.error || 'Proof submission failed');
      }
    } catch (err) {
      setResult({
        message: `❌ Error: ${err instanceof Error ? err.message : 'Unknown error'}`,
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout gradient="researcher">
      <Container>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-lg shadow-lg p-8 max-w-5xl mx-auto"
        >
          <div className="flex items-center gap-3 mb-8">
            <FlaskConical className="w-8 h-8 text-researcher-primary" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Researcher Portal</h1>
              <p className="text-gray-600 mt-1">Generate ZK proofs and submit them to the blockchain</p>
            </div>
          </div>

          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="p-6 bg-gray-50 rounded-lg"
          >
            <Textarea
              label="Capability Token"
              value={capability}
              onChange={(e) => setCapability(e.target.value)}
              placeholder="Paste capability token here"
              rows={4}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <Input
                label="Blob ID"
                value={blobId}
                onChange={(e) => setBlobId(e.target.value)}
                placeholder="Enter blob ID"
              />

              <Select
                label="Proof Type"
                value={proofType}
                onChange={(e) => setProofType(e.target.value)}
                options={[
                  { value: 'count_aggregate', label: 'Count Aggregate' },
                  { value: 'sum_aggregate', label: 'Sum Aggregate' },
                  { value: 'range_query', label: 'Range Query' },
                  { value: 'condition_query', label: 'Condition Query' },
                ]}
              />
            </div>

            <div className="mt-6 flex gap-4">
              <Button
                gradient="researcher"
                onClick={generateProof}
                disabled={loading}
              >
                {loading ? <LoadingSpinner size="sm" /> : 'Generate Proof'}
              </Button>
              
              {generatedProof && (
                <Button
                  gradient="researcher"
                  onClick={submitProof}
                  disabled={loading}
                >
                  {loading ? <LoadingSpinner size="sm" /> : 'Submit Proof to Blockchain'}
                </Button>
              )}
            </div>

            {result && (
              <div className="mt-6">
                <ResultDisplay
                  message={result.message}
                  type={result.type}
                />
              </div>
            )}
          </motion.section>
        </motion.div>
      </Container>
    </Layout>
  );
}
