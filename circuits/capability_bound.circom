pragma circom 2.1.4;

include "../node_modules/circomlib/circuits/comparators.circom";
include "../node_modules/circomlib/circuits/poseidon.circom";

/**
 * Capability-Bound Circuit
 * Ensures queries match the issued capability
 * 
 * Inputs:
 * - records[N]: Dataset records
 * - capability_hash: Hash of the capability
 * - query_params: Query parameters (must match capability)
 * - query_result: Result of the query
 * 
 * Outputs:
 * - verified: 1 if query matches capability, 0 otherwise
 * - result: Query result (if verified)
 */
template CapabilityBound(N) {
    signal input records[N];
    signal input capability_hash[2]; // Poseidon hash (2 field elements)
    signal input query_params[4]; // [field_index, operator, value, query_type]
    signal input query_result;
    signal output verified;
    signal output result;

    // Hash query parameters to match capability
    component hash_query = Poseidon(6);
    hash_query.inputs[0] <== query_params[0];
    hash_query.inputs[1] <== query_params[1];
    hash_query.inputs[2] <== query_params[2];
    hash_query.inputs[3] <== query_params[3];
    hash_query.inputs[4] <== 0; // Padding
    hash_query.inputs[5] <== 0; // Padding

    // Check if query hash matches capability hash
    signal hash_match_0;
    signal hash_match_1;
    
    hash_match_0 <== 1 - (hash_query.out[0] - capability_hash[0]) * (hash_query.out[0] - capability_hash[0]);
    hash_match_1 <== 1 - (hash_query.out[1] - capability_hash[1]) * (hash_query.out[1] - capability_hash[1]);
    
    verified <== hash_match_0 * hash_match_1;
    
    // Result is only valid if verified
    result <== query_result * verified;
}

component main = CapabilityBound(10);
