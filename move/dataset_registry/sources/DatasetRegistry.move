module dataset_registry::DatasetRegistry {
    use sui::object::{Self, UID};
    use sui::table::{Self, Table};
    use sui::tx_context::{Self, TxContext};
    use sui::transfer;
    use sui::clock::{Self, Clock};
    use sui::event;
    use std::string::{Self, String};
    use std::option::{Self, Option};

    /// Error codes
    const E_DATASET_NOT_FOUND: u64 = 0;
    const E_DATASET_ALREADY_EXISTS: u64 = 1;
    const E_UNAUTHORIZED: u64 = 2;

    /// Dataset record containing hash and metadata
    struct DatasetRecord has store {
        blob_id: String,
        dataset_hash: vector<u8>,
        owner: address,
        timestamp: u64,
    }

    /// Registry state containing all dataset records
    struct Registry has key {
        id: UID,
        datasets: Table<String, DatasetRecord>,
    }

    /// Event emitted when a dataset is registered
    struct DatasetRegistered has copy, drop {
        blob_id: String,
        owner: address,
        timestamp: u64,
    }

    /// Initialize the registry (one-time setup)
    fun init(ctx: &mut TxContext) {
        let registry = Registry {
            id: object::new(ctx),
            datasets: table::new(ctx),
        };
        transfer::share_object(registry);
    }

    /// Register a dataset hash on-chain
    public entry fun register_dataset(
        registry: &mut Registry,
        blob_id: vector<u8>,
        dataset_hash: vector<u8>,
        clock: &Clock,
        ctx: &mut TxContext,
    ) {
        let blob_id_string = string::utf8(blob_id);
        
        // Check if dataset already exists
        assert!(!table::contains(&registry.datasets, blob_id_string), E_DATASET_ALREADY_EXISTS);

        let sender = tx_context::sender(ctx);
        let timestamp = clock::timestamp_ms(clock);

        let record = DatasetRecord {
            blob_id: blob_id_string,
            dataset_hash,
            owner: sender,
            timestamp,
        };

        table::add(&mut registry.datasets, blob_id_string, record);

        // Emit event
        event::emit(DatasetRegistered {
            blob_id: blob_id_string,
            owner: sender,
            timestamp,
        });
    }

    /// Get dataset hash by blob_id
    public fun get_dataset_hash(
        registry: &Registry,
        blob_id: vector<u8>,
    ): Option<vector<u8>> {
        let blob_id_string = string::utf8(blob_id);
        
        if (table::contains(&registry.datasets, blob_id_string)) {
            let record = table::borrow(&registry.datasets, blob_id_string);
            option::some(record.dataset_hash)
        } else {
            option::none()
        }
    }

    /// Verify if a dataset exists
    public fun verify_dataset_exists(
        registry: &Registry,
        blob_id: vector<u8>,
    ): bool {
        let blob_id_string = string::utf8(blob_id);
        table::contains(&registry.datasets, blob_id_string)
    }

    /// Get dataset owner
    public fun get_dataset_owner(
        registry: &Registry,
        blob_id: vector<u8>,
    ): Option<address> {
        let blob_id_string = string::utf8(blob_id);
        
        if (table::contains(&registry.datasets, blob_id_string)) {
            let record = table::borrow(&registry.datasets, blob_id_string);
            option::some(record.owner)
        } else {
            option::none()
        }
    }

    /// Get full dataset record (for owner only)
    public fun get_dataset_record(
        registry: &Registry,
        blob_id: vector<u8>,
        ctx: &TxContext,
    ): Option<DatasetRecord> {
        let blob_id_string = string::utf8(blob_id);
        let sender = tx_context::sender(ctx);
        
        if (table::contains(&registry.datasets, blob_id_string)) {
            let record = table::borrow(&registry.datasets, blob_id_string);
            // Only owner can access full record
            if (record.owner == sender) {
                let record_copy = DatasetRecord {
                    blob_id: record.blob_id,
                    dataset_hash: *&record.dataset_hash,
                    owner: record.owner,
                    timestamp: record.timestamp,
                };
                option::some(record_copy)
            } else {
                option::none()
            }
        } else {
            option::none()
        }
    }
}
