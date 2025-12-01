module zk_record_c::ZKRecordC {

    use std::string;
    use sui::object;
    use sui::tx_context;
    use sui::transfer;

    /// Full medical data stored ON-CHAIN
    struct MedicalRecord has key {
        id: object::UID,
        blob_id: string::String,
        proof: string::String,
        public_json: string::String
    }

    /// Store full medical record on-chain
    public entry fun create_record(
        blob_id: string::String,
        proof: string::String,
        public_json: string::String,
        ctx: &mut tx_context::TxContext
    ) {
        let uid = object::new(ctx);

        let record = MedicalRecord {
            id: uid,
            blob_id,
            proof,
            public_json
        };

        let sender = tx_context::sender(ctx);
        transfer::transfer(record, sender);
    }

    /// Getters
    public fun get_blob_id(record: &MedicalRecord): &string::String {
        &record.blob_id
    }

    public fun get_proof(record: &MedicalRecord): &string::String {
        &record.proof
    }

    public fun get_public_json(record: &MedicalRecord): &string::String {
        &record.public_json
    }
}
