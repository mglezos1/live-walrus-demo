module capability_registry::CapabilityRegistry {
    use sui::object::{Self, UID};
    use sui::table::{Self, Table};
    use sui::tx_context::{Self, TxContext};
    use sui::transfer;
    use sui::clock::{Self, Clock};
    use sui::event;
    use sui::ed25519;
    use sui::bcs;
    use std::string::{Self, String};
    use std::option::{Self, Option};

    /// Error codes
    const E_CAPABILITY_NOT_FOUND: u64 = 0;
    const E_CAPABILITY_EXPIRED: u64 = 1;
    const E_INVALID_SIGNATURE: u64 = 2;
    const E_CAPABILITY_ALREADY_EXISTS: u64 = 3;
    const E_DATASET_MISMATCH: u64 = 4;

    /// Capability structure
    struct Capability has store {
        id: String,
        dataset_id_hash: vector<u8>, // u256 as bytes
        allowed_query_hash: vector<u8>, // Hash of query parameters
        expires_at: u64,
        issuer: address,
    }

    /// Registry state
    struct Registry has key {
        id: UID,
        capabilities: Table<String, Capability>,
    }

    /// Event emitted when a capability is verified
    struct CapabilityVerified has copy, drop {
        capability_id: String,
        dataset_id_hash: vector<u8>,
        verified_by: address,
        timestamp: u64,
    }

    /// Initialize the registry
    fun init(ctx: &mut TxContext) {
        let registry = Registry {
            id: object::new(ctx),
            capabilities: table::new(ctx),
        };
        transfer::share_object(registry);
    }

    /// Verify a capability signature and check validity
    public entry fun verify_capability(
        registry: &mut Registry,
        capability_id: vector<u8>,
        dataset_id_hash: vector<u8>,
        allowed_query: vector<u8>,
        signature: vector<u8>,
        public_key: vector<u8>,
        clock: &Clock,
        ctx: &mut TxContext,
    ) {
        let capability_id_string = string::utf8(capability_id);
        
        // Check if capability already exists
        assert!(!table::contains(&registry.capabilities, capability_id_string), E_CAPABILITY_ALREADY_EXISTS);

        // Verify signature
        // Create message: capability_id || dataset_id_hash || allowed_query
        let mut message = vector::empty<u8>();
        let capability_id_bytes = bcs::to_bytes(&capability_id_string);
        vector::append(&mut message, capability_id_bytes);
        vector::append(&mut message, dataset_id_hash);
        vector::append(&mut message, allowed_query);

        let is_valid = ed25519::ed25519_verify(&signature, &message, &public_key);
        assert!(is_valid, E_INVALID_SIGNATURE);

        // For now, we'll store the capability with a default expiration
        // In practice, expiration should be part of the signed message
        let timestamp = clock::timestamp_ms(clock);
        let expires_at = timestamp + 86400000; // Default: 24 hours from now

        let capability = Capability {
            id: capability_id_string,
            dataset_id_hash,
            allowed_query_hash: allowed_query,
            expires_at,
            issuer: tx_context::sender(ctx),
        };

        table::add(&mut registry.capabilities, capability_id_string, capability);

        // Emit event
        event::emit(CapabilityVerified {
            capability_id: capability_id_string,
            dataset_id_hash,
            verified_by: tx_context::sender(ctx),
            timestamp,
        });
    }

    /// Check if a capability is valid for a dataset
    public fun check_capability_valid(
        registry: &Registry,
        capability_id: vector<u8>,
        dataset_id_hash: vector<u8>,
        clock: &Clock,
    ): bool {
        let capability_id_string = string::utf8(capability_id);
        
        if (!table::contains(&registry.capabilities, capability_id_string)) {
            return false
        };

        let capability = table::borrow(&registry.capabilities, capability_id_string);
        
        // Check dataset match
        if (capability.dataset_id_hash != dataset_id_hash) {
            return false
        };

        // Check expiration
        let timestamp = clock::timestamp_ms(clock);
        if (capability.expires_at < timestamp) {
            return false
        };

        true
    }

    /// Get capability details
    public fun get_capability(
        registry: &Registry,
        capability_id: vector<u8>,
    ): Option<Capability> {
        let capability_id_string = string::utf8(capability_id);
        
        if (table::contains(&registry.capabilities, capability_id_string)) {
            let cap = table::borrow(&registry.capabilities, capability_id_string);
            let cap_copy = Capability {
                id: cap.id,
                dataset_id_hash: *&cap.dataset_id_hash,
                allowed_query_hash: *&cap.allowed_query_hash,
                expires_at: cap.expires_at,
                issuer: cap.issuer,
            };
            option::some(cap_copy)
        } else {
            option::none()
        }
    }

    /// Check if capability exists
    public fun capability_exists(
        registry: &Registry,
        capability_id: vector<u8>,
    ): bool {
        let capability_id_string = string::utf8(capability_id);
        table::contains(&registry.capabilities, capability_id_string)
    }
}
