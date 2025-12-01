module zkp_walrus::ZKRecord {

    use std::string;
    use sui::object;
    use sui::tx_context::{TxContext};

    struct TestRecord has key {
        id: UID,
        walrus_bundle_id: string::String,
        timestamp: u64
    }

    /// Create a new ZKP Medical Record pointing to Walrus bundle
    public fun create(
        walrus_bundle_id: string::String,
        ctx: &mut TxContext
    ): TestRecord {
        TestRecord {
            id: object::new(ctx),
            walrus_bundle_id,
            timestamp: 0
        }
    }
}
