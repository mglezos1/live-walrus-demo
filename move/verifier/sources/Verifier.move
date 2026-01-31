module verifier::Verifier {
    use sui::object::{Self, UID};
    use sui::table::{Self, Table};
    use sui::tx_context::{Self, TxContext};
    use sui::transfer;
    use proof_verifier::ProofVerifier::{Self, Registry, ProofResult};
    use std::string::{Self, String};
    use std::option::{Self, Option};
    use std::vector;

    /// Error codes
    const E_PROOF_NOT_FOUND: u64 = 0;

    /// Index for querying proofs by dataset
    struct DatasetProofIndex has key {
        id: UID,
        proofs_by_dataset: Table<String, vector<String>>, // blob_id -> list of proof_ids
    }

    /// Initialize the verifier index
    fun init(ctx: &mut TxContext) {
        let index = DatasetProofIndex {
            id: object::new(ctx),
            proofs_by_dataset: table::new(ctx),
        };
        transfer::share_object(index);
    }

    /// Get proof result by proof_id
    public fun get_proof_result(
        proof_registry: &ProofVerifier::Registry,
        proof_id: vector<u8>,
    ): Option<ProofResult> {
        ProofVerifier::get_proof_result(proof_registry, proof_id)
    }

    /// List all proof IDs for a dataset (requires index to be maintained)
    /// Note: This is a simplified version. In production, you'd maintain an index
    /// that maps blob_id to proof_ids as proofs are submitted.
    public fun list_proof_ids_by_dataset(
        index: &DatasetProofIndex,
        blob_id: vector<u8>,
    ): Option<vector<String>> {
        let blob_id_string = string::utf8(blob_id);
        
        if (table::contains(&index.proofs_by_dataset, blob_id_string)) {
            let proof_ids = table::borrow(&index.proofs_by_dataset, blob_id_string);
            option::some(*proof_ids)
        } else {
            option::none()
        }
    }

    /// Helper function to check if proof exists
    public fun proof_exists(
        proof_registry: &ProofVerifier::Registry,
        proof_id: vector<u8>,
    ): bool {
        ProofVerifier::proof_exists(proof_registry, proof_id)
    }

    /// Get proof result with blob_id check
    public fun get_proof_result_for_dataset(
        proof_registry: &ProofVerifier::Registry,
        proof_id: vector<u8>,
        blob_id: vector<u8>,
    ): Option<ProofResult> {
        let proof_result_opt = ProofVerifier::get_proof_result(proof_registry, proof_id);
        
        if (option::is_some(&proof_result_opt)) {
            let proof_result = option::extract(&mut proof_result_opt);
            let blob_id_string = string::utf8(blob_id);
            
            // Verify blob_id matches
            if (proof_result.blob_id == blob_id_string) {
                option::some(proof_result)
            } else {
                option::none()
            }
        } else {
            option::none()
        }
    }
}
