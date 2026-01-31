module proof_verifier::ProofVerifier {
    use sui::object::{Self, UID};
    use sui::table::{Self, Table};
    use sui::tx_context::{Self, TxContext};
    use sui::transfer;
    use sui::clock::{Self, Clock};
    use sui::groth16::{Self, Curve, PreparedVerifyingKey, PublicProofInputs, ProofPoints, bn254, prepare_verifying_key, verify_groth16_proof};
    use sui::event;
    use std::string::{Self, String};
    use std::option::{Self, Option};

    /// Error codes
    const E_PROOF_INVALID: u64 = 0;
    const E_VERIFYING_KEY_NOT_FOUND: u64 = 1;
    const E_PROOF_ALREADY_EXISTS: u64 = 2;
    const E_INVALID_INPUT: u64 = 3;

    /// Proof result stored on-chain
    struct ProofResult has store {
        proof_id: String,
        blob_id: String,
        public_output: vector<u8>,
        verified_at: u64,
        verifier_address: address,
        circuit_id: String,
    }

    /// Verifying key registry
    struct VerifyingKey has store {
        circuit_id: String,
        prepared_vk: PreparedVerifyingKey,
    }

    /// Registry state
    struct Registry has key {
        id: UID,
        proofs: Table<String, ProofResult>,
        verifying_keys: Table<String, VerifyingKey>,
    }

    /// Event emitted when a proof is verified
    struct ProofVerified has copy, drop {
        proof_id: String,
        blob_id: String,
        verifier_address: address,
        timestamp: u64,
    }

    /// Event emitted when a verifying key is registered
    struct VerifyingKeyRegistered has copy, drop {
        circuit_id: String,
        registered_by: address,
    }

    /// Initialize the registry
    fun init(ctx: &mut TxContext) {
        let registry = Registry {
            id: object::new(ctx),
            proofs: table::new(ctx),
            verifying_keys: table::new(ctx),
        };
        transfer::share_object(registry);
    }

    /// Register a verifying key for a circuit
    public entry fun register_verifying_key(
        registry: &mut Registry,
        circuit_id: vector<u8>,
        verifying_key_bytes: vector<u8>,
        ctx: &mut TxContext,
    ) {
        let circuit_id_string = string::utf8(circuit_id);
        
        // Check if key already exists
        assert!(!table::contains(&registry.verifying_keys, circuit_id_string), E_VERIFYING_KEY_NOT_FOUND);

        // Prepare verifying key using BN254 curve (for Circom compatibility)
        let curve = bn254();
        let prepared_vk = prepare_verifying_key(&curve, &verifying_key_bytes);

        let vk = VerifyingKey {
            circuit_id: circuit_id_string,
            prepared_vk,
        };

        table::add(&mut registry.verifying_keys, circuit_id_string, vk);

        // Emit event
        event::emit(VerifyingKeyRegistered {
            circuit_id: circuit_id_string,
            registered_by: tx_context::sender(ctx),
        });
    }

    /// Verify a Groth16 proof and store the result
    public entry fun verify_proof(
        registry: &mut Registry,
        proof_id: vector<u8>,
        blob_id: vector<u8>,
        public_output: vector<u8>,
        proof_points_bytes: vector<u8>,
        public_inputs_bytes: vector<u8>,
        circuit_id: vector<u8>,
        clock: &Clock,
        ctx: &mut TxContext,
    ) {
        let proof_id_string = string::utf8(proof_id);
        let blob_id_string = string::utf8(blob_id);
        let circuit_id_string = string::utf8(circuit_id);

        // Check if proof already exists
        assert!(!table::contains(&registry.proofs, proof_id_string), E_PROOF_ALREADY_EXISTS);

        // Get verifying key
        assert!(table::contains(&registry.verifying_keys, circuit_id_string), E_VERIFYING_KEY_NOT_FOUND);
        let vk = table::borrow(&registry.verifying_keys, circuit_id_string);

        // Prepare proof inputs
        let public_proof_inputs = groth16::public_proof_inputs_from_bytes(public_inputs_bytes);
        let proof_points = groth16::proof_points_from_bytes(proof_points_bytes);

        // Verify proof using BN254 curve
        let curve = bn254();
        let is_valid = verify_groth16_proof(
            &curve,
            &vk.prepared_vk,
            &public_proof_inputs,
            &proof_points,
        );

        assert!(is_valid, E_PROOF_INVALID);

        // Store proof result
        let sender = tx_context::sender(ctx);
        let timestamp = clock::timestamp_ms(clock);

        let result = ProofResult {
            proof_id: proof_id_string,
            blob_id: blob_id_string,
            public_output,
            verified_at: timestamp,
            verifier_address: sender,
            circuit_id: circuit_id_string,
        };

        table::add(&mut registry.proofs, proof_id_string, result);

        // Emit event
        event::emit(ProofVerified {
            proof_id: proof_id_string,
            blob_id: blob_id_string,
            verifier_address: sender,
            timestamp,
        });
    }

    /// Get proof result by proof_id
    public fun get_proof_result(
        registry: &Registry,
        proof_id: vector<u8>,
    ): Option<ProofResult> {
        let proof_id_string = string::utf8(proof_id);
        
        if (table::contains(&registry.proofs, proof_id_string)) {
            let result = table::borrow(&registry.proofs, proof_id_string);
            let result_copy = ProofResult {
                proof_id: result.proof_id,
                blob_id: result.blob_id,
                public_output: *&result.public_output,
                verified_at: result.verified_at,
                verifier_address: result.verifier_address,
                circuit_id: result.circuit_id,
            };
            option::some(result_copy)
        } else {
            option::none()
        }
    }

    /// Check if proof exists
    public fun proof_exists(
        registry: &Registry,
        proof_id: vector<u8>,
    ): bool {
        let proof_id_string = string::utf8(proof_id);
        table::contains(&registry.proofs, proof_id_string)
    }
}
