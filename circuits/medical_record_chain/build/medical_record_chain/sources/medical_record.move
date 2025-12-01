module mr::medical_record {

    use sui::object::{Self, UID};
    use sui::tx_context;
    use sui::tx_context::TxContext;
    use sui::transfer;

    //
    // The on-chain medical record object
    //
    struct MedicalRecord has key, store {
        id: UID,
        patient_id: u256,           // <-- now large enough for Poseidon hash
        walrus_blob: vector<u8>,
        timestamp: u64
    }

    //
    // Create a record and send it to the sender.
    //
    public entry fun create_record(
        patient_id: u256,           // <-- changed to u256
        walrus_blob: vector<u8>,
        timestamp: u64,
        ctx: &mut TxContext
    ) {
        let record = MedicalRecord {
            id: object::new(ctx),
            patient_id,
            walrus_blob,
            timestamp
        };

        transfer::transfer(record, tx_context::sender(ctx));
    }

    //
    // Getters
    //
    public fun get_patient_id(record: &MedicalRecord): u256 {
        record.patient_id
    }

    public fun get_blob(record: &MedicalRecord): vector<u8> {
        record.walrus_blob
    }

    public fun get_timestamp(record: &MedicalRecord): u64 {
        record.timestamp
    }
}
