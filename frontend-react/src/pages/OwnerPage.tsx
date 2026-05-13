import { useState, useRef } from 'react';
import { Layout } from '../components/layout/Layout';
import { Container } from '../components/layout/Container';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Textarea } from '../components/ui/Textarea';
import { Select } from '../components/ui/Select';
import { ResultDisplay } from '../components/ui/ResultDisplay';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { DatasetCard } from '../components/ui/DatasetCard';
import { useDatasets } from '../hooks/useDatasets';
import { useCapabilities } from '../hooks/useCapabilities';
import { motion } from 'framer-motion';
import { Database, Upload, Key, Plus, X } from 'lucide-react';
import './OwnerPage.css';

interface Condition {
  field: string;
  operator: string;
  value: string | number;
}

interface QueryParams {
  field?: string;
  condition?: string;
  operator?: string;
  value?: string | number;
  min_value?: number;
  max_value?: number;
  conditions?: Condition[]; // For multi-condition queries
  logic_op?: 'AND' | 'OR'; // For combining multiple conditions
}

export function OwnerPage() {
  const { datasets, loading: datasetsLoading, uploadDataset, loadDatasets } = useDatasets();
  const { issueCapability, loading: capabilityLoading } = useCapabilities();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [uploadResult, setUploadResult] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [capabilityResult, setCapabilityResult] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  
  const [capabilityForm, setCapabilityForm] = useState({
    dataset_id_hash: '',
    query_type: 'count_aggregate',
    query_params: {} as QueryParams,
    expires_at: '',
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const result = await uploadDataset(file);
      const walrusUrl = result.blobId ? `https://walruscan.com/testnet/blob/${result.blobId}` : '';
      setUploadResult({
        message: `✅ Dataset uploaded successfully!\n\nBlob ID: ${result.blobId}\n${walrusUrl ? `View on Walrus Testnet: ${walrusUrl}\n` : ''}Dataset Hash: ${result.datasetHash}\nRecord Count: ${result.recordCount}`,
        type: 'success',
      });
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      setUploadResult({
        message: `❌ Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        type: 'error',
      });
    }
  };

  const handleIssueCapability = async () => {
    if (!capabilityForm.dataset_id_hash) {
      setCapabilityResult({
        message: 'Please enter a dataset hash',
        type: 'error',
      });
      return;
    }

    // Validate required fields based on query type
    const { query_type, query_params } = capabilityForm;
    
    if (query_type === 'count_aggregate') {
      // Check if it's multi-condition mode
      if (Array.isArray(query_params.conditions)) {
        if (query_params.conditions.length === 0) {
          setCapabilityResult({
            message: 'Please add at least one condition',
            type: 'error',
          });
          return;
        }
        // Validate each condition
        for (let i = 0; i < query_params.conditions.length; i++) {
          const cond = query_params.conditions[i];
          if (!cond.field || !cond.operator || cond.value === undefined || cond.value === '') {
            setCapabilityResult({
              message: `Please fill in all fields for condition ${i + 1}: Field Name, Operator, and Value`,
              type: 'error',
            });
            return;
          }
        }
      } else {
        // Single condition mode
        if (!query_params.field || !query_params.condition || query_params.value === undefined || query_params.value === '') {
          setCapabilityResult({
            message: 'Please fill in all required fields: Field Name, Condition, and Value',
            type: 'error',
          });
          return;
        }
      }
    } else if (query_type === 'sum_aggregate') {
      if (!query_params.field) {
        setCapabilityResult({
          message: 'Please enter field name',
          type: 'error',
        });
        return;
      }
    } else if (query_type === 'range_query') {
      if (!query_params.field || query_params.min_value === undefined || query_params.min_value === '' || 
          query_params.max_value === undefined || query_params.max_value === '') {
        setCapabilityResult({
          message: 'Please fill in all required fields: Field Name, Minimum Value, and Maximum Value',
          type: 'error',
        });
        return;
      }
    } else if (query_type === 'condition_query') {
      if (!query_params.field || !query_params.operator || query_params.value === undefined || query_params.value === '') {
        setCapabilityResult({
          message: 'Please fill in all required fields: Field Name, Operator, and Value',
          type: 'error',
        });
        return;
      }
    } else if (query_type === 'custom') {
      // For custom, just check that query_params is not empty
      if (!query_params || Object.keys(query_params).length === 0) {
        setCapabilityResult({
          message: 'Please enter custom query parameters as JSON',
          type: 'error',
        });
        return;
      }
    }

    // Map frontend query types to backend query types
    const mapQueryType = (frontendType: string): string => {
      const mapping: Record<string, string> = {
        'count_aggregate': 'aggregate',
        'sum_aggregate': 'aggregate',
        'range_query': 'range',
        'condition_query': 'condition',
        'custom': 'custom',
      };
      return mapping[frontendType] || frontendType;
    };

    try {
      const result = await issueCapability({
        dataset_id_hash: capabilityForm.dataset_id_hash,
        query_type: mapQueryType(capabilityForm.query_type),
        query_params: capabilityForm.query_params,
        expires_at: capabilityForm.expires_at ? parseInt(capabilityForm.expires_at) : undefined,
      });

      setCapabilityResult({
        message: `✅ Capability issued!\n\nCapability ID: ${result.capability.id}\nQuery Type: ${result.capability.query_type}\nExpires At: ${new Date(result.capability.expires_at).toLocaleString()}`,
        type: 'success',
      });

      // Reset form
      setCapabilityForm({
        dataset_id_hash: '',
        query_type: 'count_aggregate',
        query_params: {},
        expires_at: '',
      });
    } catch (error) {
      setCapabilityResult({
        message: `❌ Failed to issue capability: ${error instanceof Error ? error.message : 'Unknown error'}`,
        type: 'error',
      });
    }
  };

  const renderMultiConditionForm = () => {
    const conditions = capabilityForm.query_params.conditions || [];
    const logicOp = capabilityForm.query_params.logic_op || 'AND';

    const addCondition = () => {
      const newConditions = [...conditions, { field: '', operator: '>', value: '' }];
      setCapabilityForm({
        ...capabilityForm,
        query_params: {
          ...capabilityForm.query_params,
          conditions: newConditions,
        },
      });
    };

    const removeCondition = (index: number) => {
      const newConditions = conditions.filter((_, i) => i !== index);
      setCapabilityForm({
        ...capabilityForm,
        query_params: {
          ...capabilityForm.query_params,
          conditions: newConditions.length > 0 ? newConditions : undefined,
          logic_op: newConditions.length <= 1 ? undefined : logicOp,
        },
      });
    };

    const updateCondition = (index: number, field: keyof Condition, value: string | number) => {
      const newConditions = [...conditions];
      newConditions[index] = { ...newConditions[index], [field]: value };
      setCapabilityForm({
        ...capabilityForm,
        query_params: {
          ...capabilityForm.query_params,
          conditions: newConditions,
        },
      });
    };

    return (
      <>
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-gray-700">
              Conditions
            </label>
            <button
              type="button"
              onClick={addCondition}
              className="flex items-center gap-1 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Condition
            </button>
          </div>

          {conditions.length === 0 ? (
            <div className="p-4 bg-gray-50 rounded-lg text-sm text-gray-500 text-center">
              No conditions added. Click "Add Condition" to get started.
            </div>
          ) : (
            <>
              {conditions.map((condition, index) => (
                <div key={index} className="mb-4 p-4 border border-gray-200 rounded-lg bg-white">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium text-gray-700">
                      Condition {index + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeCondition(index)}
                      className="flex items-center gap-1 text-red-600 hover:text-red-800 text-sm transition-colors"
                    >
                      <X className="w-4 h-4" />
                      Remove
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <Input
                      label="Field Name"
                      value={condition.field}
                      onChange={(e) => updateCondition(index, 'field', e.target.value)}
                      placeholder="e.g., age"
                    />
                    <Select
                      label="Operator"
                      value={condition.operator}
                      onChange={(e) => updateCondition(index, 'operator', e.target.value)}
                      options={[
                        { value: '>', label: 'Greater than (>)' },
                        { value: '<', label: 'Less than (<)' },
                        { value: '>=', label: 'Greater than or equal (>=)' },
                        { value: '<=', label: 'Less than or equal (<=)' },
                        { value: '==', label: 'Equal to (==)' },
                      ]}
                    />
                    <Input
                      label="Value"
                      type="number"
                      value={condition.value}
                      onChange={(e) => updateCondition(index, 'value', parseFloat(e.target.value) || '')}
                      placeholder="e.g., 18"
                    />
                  </div>
                </div>
              ))}

              {conditions.length > 1 && (
                <Select
                  label="Logic Operator (How to combine conditions)"
                  value={logicOp}
                  onChange={(e) =>
                    setCapabilityForm({
                      ...capabilityForm,
                      query_params: {
                        ...capabilityForm.query_params,
                        logic_op: e.target.value as 'AND' | 'OR',
                      },
                    })
                  }
                  options={[
                    { value: 'AND', label: 'AND (all conditions must match)' },
                    { value: 'OR', label: 'OR (any condition can match)' },
                  ]}
                />
              )}
            </>
          )}
        </div>
      </>
    );
  };

  const renderQueryParamsForm = () => {
    const { query_type, query_params } = capabilityForm;

    switch (query_type) {
      case 'count_aggregate':
        const isMultiCondition = Array.isArray(query_params.conditions);
        
        return (
          <>
            <div className="mb-4 flex items-center gap-4">
              <button
                type="button"
                onClick={() => {
                  if (isMultiCondition) {
                    // Switch to single condition
                    setCapabilityForm({
                      ...capabilityForm,
                      query_params: { field: '', condition: '>', value: '' },
                    });
                  } else {
                    // Switch to multi-condition
                    setCapabilityForm({
                      ...capabilityForm,
                      query_params: {
                        conditions: [{ field: '', operator: '>', value: '' }],
                        logic_op: 'AND',
                      },
                    });
                  }
                }}
                className="text-sm text-blue-600 hover:text-blue-800 underline transition-colors"
              >
                {isMultiCondition ? 'Switch to single condition' : 'Switch to multiple conditions'}
              </button>
            </div>

            {isMultiCondition ? (
              renderMultiConditionForm()
            ) : (
              <>
                <Input
                  label="Field Name"
                  value={query_params.field || ''}
                  onChange={(e) =>
                    setCapabilityForm({
                      ...capabilityForm,
                      query_params: { ...query_params, field: e.target.value },
                    })
                  }
                  placeholder="e.g., age, salary, score, any_field_name"
                />
                <div className="mt-1 mb-3 text-xs text-gray-500">
                  Enter any field name - it doesn't need to exist in uploaded datasets
                </div>
                <Select
                  label="Condition"
                  value={query_params.condition || ''}
                  onChange={(e) =>
                    setCapabilityForm({
                      ...capabilityForm,
                      query_params: { ...query_params, condition: e.target.value },
                    })
                  }
                  options={[
                    { value: '>', label: 'Greater than (>)' },
                    { value: '<', label: 'Less than (<)' },
                    { value: '>=', label: 'Greater than or equal (>=)' },
                    { value: '<=', label: 'Less than or equal (<=)' },
                    { value: '==', label: 'Equal to (==)' },
                  ]}
                />
                <Input
                  label="Value"
                  type="number"
                  value={query_params.value || ''}
                  onChange={(e) =>
                    setCapabilityForm({
                      ...capabilityForm,
                      query_params: { ...query_params, value: parseFloat(e.target.value) || undefined },
                    })
                  }
                  placeholder="e.g., 18"
                />
              </>
            )}
          </>
        );

      case 'sum_aggregate':
        return (
          <>
            <Input
              label="Field Name"
              value={query_params.field || ''}
              onChange={(e) =>
                setCapabilityForm({
                  ...capabilityForm,
                  query_params: { ...query_params, field: e.target.value },
                })
              }
              placeholder="e.g., salary, amount, quantity, any_field_name"
            />
            <div className="mt-1 text-xs text-gray-500">
              Enter any field name - it doesn't need to exist in uploaded datasets
            </div>
          </>
        );

      case 'range_query':
        return (
          <>
            <Input
              label="Field Name"
              value={query_params.field || ''}
              onChange={(e) =>
                setCapabilityForm({
                  ...capabilityForm,
                  query_params: { ...query_params, field: e.target.value },
                })
              }
              placeholder="e.g., age, price, score, any_field_name"
            />
            <div className="mt-1 mb-3 text-xs text-gray-500">
              Enter any field name - it doesn't need to exist in uploaded datasets
            </div>
            <Input
              label="Minimum Value"
              type="number"
              value={query_params.min_value || ''}
              onChange={(e) =>
                setCapabilityForm({
                  ...capabilityForm,
                  query_params: { ...query_params, min_value: parseFloat(e.target.value) || undefined },
                })
              }
              placeholder="e.g., 18"
            />
            <Input
              label="Maximum Value"
              type="number"
              value={query_params.max_value || ''}
              onChange={(e) =>
                setCapabilityForm({
                  ...capabilityForm,
                  query_params: { ...query_params, max_value: parseFloat(e.target.value) || undefined },
                })
              }
              placeholder="e.g., 65"
            />
          </>
        );

      case 'condition_query':
        return (
          <>
            <Input
              label="Field Name"
              value={query_params.field || ''}
              onChange={(e) =>
                setCapabilityForm({
                  ...capabilityForm,
                  query_params: { ...query_params, field: e.target.value },
                })
              }
              placeholder="e.g., age, status, score, any_field_name"
            />
            <div className="mt-1 mb-3 text-xs text-gray-500">
              Enter any field name - it doesn't need to exist in uploaded datasets
            </div>
            <Select
              label="Operator"
              value={query_params.operator || ''}
              onChange={(e) =>
                setCapabilityForm({
                  ...capabilityForm,
                  query_params: { ...query_params, operator: e.target.value },
                })
              }
              options={[
                { value: '==', label: 'Equal to (==)' },
                { value: '>=', label: 'Greater than or equal (>=)' },
                { value: '<=', label: 'Less than or equal (<=)' },
                { value: '>', label: 'Greater than (>)' },
                { value: '<', label: 'Less than (<)' },
              ]}
            />
            <Input
              label="Value"
              type="number"
              value={query_params.value || ''}
              onChange={(e) =>
                setCapabilityForm({
                  ...capabilityForm,
                  query_params: { ...query_params, value: parseFloat(e.target.value) || undefined },
                })
              }
              placeholder="e.g., 18"
            />
          </>
        );

      case 'custom':
        return (
          <>
            <div className="mb-2 p-3 bg-blue-50 rounded-lg text-sm text-gray-600">
              <strong>Custom Query:</strong> Enter any query parameters as JSON. 
              This allows you to create capabilities for any fields or conditions.
            </div>
            <Textarea
              label="Query Parameters (JSON)"
              value={JSON.stringify(query_params, null, 2)}
              onChange={(e) => {
                try {
                  const parsed = JSON.parse(e.target.value);
                  setCapabilityForm({
                    ...capabilityForm,
                    query_params: parsed,
                  });
                } catch (e) {
                  // Invalid JSON, ignore
                }
              }}
              placeholder='{"field": "any_field_name", "operator": ">", "value": 18}'
              rows={6}
            />
            <div className="mt-2 text-xs text-gray-500">
              <strong>Examples:</strong><br/>
              Count: {`{"field": "age", "condition": ">", "value": 18}`}<br/>
              Sum: {`{"field": "salary"}`}<br/>
              Range: {`{"field": "age", "min_value": 18, "max_value": 65}`}
            </div>
          </>
        );

      default:
        return (
          <Textarea
            label="Query Parameters (JSON)"
            value={JSON.stringify(query_params, null, 2)}
            onChange={(e) => {
              try {
                const parsed = JSON.parse(e.target.value);
                setCapabilityForm({
                  ...capabilityForm,
                  query_params: parsed,
                });
              } catch (e) {
                // Invalid JSON, ignore
              }
            }}
            placeholder='{"field": "age", "operator": ">", "value": 18}'
            rows={4}
          />
        );
    }
  };

  return (
    <Layout gradient="owner">
      <Container>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-lg shadow-lg p-8 max-w-5xl mx-auto"
        >
          <div className="flex items-center gap-3 mb-8">
            <Database className="w-8 h-8 text-owner-primary" />
            <h1 className="text-3xl font-bold text-gray-900">Data Owner Portal</h1>
          </div>

          {/* Upload Dataset Section */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mb-10 p-6 bg-gray-50 rounded-lg"
          >
            <div className="flex items-center gap-2 mb-4">
              <Upload className="w-5 h-5 text-owner-primary" />
              <h2 className="text-xl font-semibold text-gray-900">1. Upload Dataset</h2>
            </div>
            <div className="mb-4">
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.json"
                onChange={handleFileUpload}
                className="hidden"
                id="datasetFile"
              />
              <label htmlFor="datasetFile">
                <Button
                  gradient="owner"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={datasetsLoading}
                  className="cursor-pointer"
                >
                  {datasetsLoading ? <LoadingSpinner size="sm" /> : 'Select Dataset File (Excel or JSON)'}
                </Button>
              </label>
              <div className="mt-2 text-xs text-gray-500">
                Supported formats: Excel (.xlsx, .xls) or JSON (.json). Excel files will be converted automatically.
              </div>
            </div>
            {uploadResult && (
              <ResultDisplay
                message={uploadResult.message}
                type={uploadResult.type}
              />
            )}
          </motion.section>

          {/* Issue Capability Section */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mb-10 p-6 bg-gray-50 rounded-lg"
          >
            <div className="flex items-center gap-2 mb-4">
              <Key className="w-5 h-5 text-owner-primary" />
              <h2 className="text-xl font-semibold text-gray-900">2. Issue Capability</h2>
            </div>

            {/* Info Box */}
            <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h3 className="font-semibold text-blue-900 mb-2">💡 Flexible Capability Creation</h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• You can create capabilities for datasets you haven't uploaded</li>
                <li>• Field names can be any string - they don't need to exist yet</li>
                <li>• Capabilities are validated when proofs are generated, not when issued</li>
                <li>• Use "Custom" query type for advanced or non-standard queries</li>
              </ul>
            </div>

            {/* Dataset Hash Input */}
            <div className="mb-4">
              <Input
                label="Dataset Hash (Required)"
                value={capabilityForm.dataset_id_hash}
                onChange={(e) =>
                  setCapabilityForm({ ...capabilityForm, dataset_id_hash: e.target.value })
                }
                placeholder="Enter dataset hash (hex string)"
                required
              />
              <div className="mt-1 text-xs text-gray-500">
                You can enter any dataset hash - it doesn't need to be uploaded to this system
              </div>
              
              {/* Optional dropdown for quick selection */}
              {datasets.length > 0 && (
                <div className="mt-3">
                  <label className="block text-xs text-gray-500 mb-1">
                    Or quickly select from uploaded datasets:
                  </label>
                  <Select
                    value=""
                    onChange={(e) => {
                      if (e.target.value) {
                        setCapabilityForm({ ...capabilityForm, dataset_id_hash: e.target.value });
                      }
                    }}
                    options={[
                      { value: '', label: 'Click to select...' },
                      ...datasets.map((dataset) => ({
                        value: dataset.datasetHash || dataset.blobId || '',
                        label: `${dataset.blobId || 'Dataset'} ${dataset.datasetHash ? `(${dataset.datasetHash.slice(0, 8)}...)` : ''}`,
                      })),
                    ]}
                  />
                </div>
              )}
              {capabilityForm.dataset_id_hash && (
                <div className="mt-2 p-2 bg-green-50 rounded text-xs text-gray-600">
                  <strong>✓ Dataset Hash:</strong> {capabilityForm.dataset_id_hash.slice(0, 16)}...
                </div>
              )}
            </div>
            <Select
              label="Query Type"
              value={capabilityForm.query_type}
              onChange={(e) =>
                setCapabilityForm({
                  ...capabilityForm,
                  query_type: e.target.value,
                  query_params: {}, // Reset params when type changes
                })
              }
              options={[
                { value: 'count_aggregate', label: 'Count Aggregate' },
                { value: 'sum_aggregate', label: 'Sum Aggregate' },
                { value: 'range_query', label: 'Range Query' },
                { value: 'condition_query', label: 'Condition Query' },
                { value: 'custom', label: 'Custom (Advanced)' },
              ]}
            />
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Query Parameters
              </label>
              {renderQueryParamsForm()}
            </div>
            <Input
              label="Expires At (optional, timestamp)"
              type="number"
              value={capabilityForm.expires_at}
              onChange={(e) =>
                setCapabilityForm({ ...capabilityForm, expires_at: e.target.value })
              }
              placeholder="Leave empty for 24h default"
            />
            <Button
              gradient="owner"
              onClick={handleIssueCapability}
              disabled={capabilityLoading}
            >
              {capabilityLoading ? <LoadingSpinner size="sm" /> : 'Issue Capability'}
            </Button>
            {capabilityResult && (
              <ResultDisplay
                message={capabilityResult.message}
                type={capabilityResult.type}
              />
            )}
          </motion.section>

          {/* My Datasets Section */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="p-6 bg-gray-50 rounded-lg"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">3. My Datasets</h2>
              <Button gradient="owner" onClick={loadDatasets} disabled={datasetsLoading}>
                Refresh Datasets
              </Button>
            </div>
            {datasetsLoading ? (
              <LoadingSpinner />
            ) : datasets.length === 0 ? (
              <p className="text-gray-500">No datasets found</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {datasets.map((dataset, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <DatasetCard dataset={dataset} />
                  </motion.div>
                ))}
              </div>
            )}
          </motion.section>
        </motion.div>
      </Container>
    </Layout>
  );
}
