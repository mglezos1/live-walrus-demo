// controllers/capabilityController.js
// Enhanced capability controller with cryptographic signatures

import {
  issueCapability,
  getCapability,
  listCapabilities,
  getCapabilitiesForDataset,
  validateCapability,
  getIssuerPublicKey,
} from '../capabilityRegistry.js';

/**
 * Issue a new capability
 * POST /capabilities/issue
 * Body: {
 *   dataset_id_hash: string,
 *   query_type: 'aggregate' | 'range' | 'condition' | 'custom',
 *   query_params: object,
 *   expires_at?: number (optional timestamp)
 * }
 */
export async function issueCapabilityController(req, res) {
  try {
    const { dataset_id_hash, query_type, query_params, expires_at } = req.body;

    // Validate required fields
    if (!dataset_id_hash) {
      return res.status(400).json({
        error: 'dataset_id_hash is required'
      });
    }

    if (!query_type || !['aggregate', 'range', 'condition', 'custom'].includes(query_type)) {
      return res.status(400).json({
        error: 'query_type must be one of: aggregate, range, condition, custom'
      });
    }

    // Issue capability
    const capability = issueCapability({
      dataset_id_hash,
      query_type,
      query_params: query_params || {},
      expires_at,
    });

    res.json({
      success: true,
      capability,
    });
  } catch (err) {
    console.error('Issue capability error:', err);
    res.status(500).json({
      error: 'Failed to issue capability',
      details: err.message
    });
  }
}

/**
 * Get capability by ID
 * GET /capabilities/:id
 */
export async function getCapabilityController(req, res) {
  try {
    const { id } = req.params;
    const capability = getCapability(id);

    if (!capability) {
      return res.status(404).json({
        error: 'Capability not found'
      });
    }

    // Validate capability
    const isValid = validateCapability(capability);

    res.json({
      capability,
      valid: isValid,
    });
  } catch (err) {
    console.error('Get capability error:', err);
    res.status(500).json({
      error: 'Failed to get capability',
      details: err.message
    });
  }
}

/**
 * List all capabilities
 * GET /capabilities
 */
export async function listCapabilitiesController(req, res) {
  try {
    const capabilities = listCapabilities();
    res.json({
      capabilities,
      count: capabilities.length,
    });
  } catch (err) {
    console.error('List capabilities error:', err);
    res.status(500).json({
      error: 'Failed to list capabilities',
      details: err.message
    });
  }
}

/**
 * Get capabilities for a dataset
 * GET /capabilities/dataset/:dataset_id_hash
 */
export async function getCapabilitiesForDatasetController(req, res) {
  try {
    const { dataset_id_hash } = req.params;
    const capabilities = getCapabilitiesForDataset(dataset_id_hash);

    res.json({
      capabilities,
      count: capabilities.length,
    });
  } catch (err) {
    console.error('Get capabilities for dataset error:', err);
    res.status(500).json({
      error: 'Failed to get capabilities for dataset',
      details: err.message
    });
  }
}

/**
 * Get issuer public key
 * GET /capabilities/issuer/public-key
 */
export async function getIssuerPublicKeyController(req, res) {
  try {
    const publicKey = getIssuerPublicKey();
    res.json({
      publicKey,
    });
  } catch (err) {
    console.error('Get issuer public key error:', err);
    res.status(500).json({
      error: 'Failed to get issuer public key',
      details: err.message
    });
  }
}
