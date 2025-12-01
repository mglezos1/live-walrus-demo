module 0x0::ZKRecordV2 {

    use sui::object::{Self, UID};
    use sui::tx_context::{Self, TxContext};
    use sui::transfer;

    use std::ascii::String;

    struct MedicalRecord has key {
        id: UID,
        blob_id: String,
    }

    public entry fun create_record(
        blob_id: String,
        ctx: &mut TxContext
    ) {
        let uid = object::new(ctx);

        let record = MedicalRecord {
            id: uid,
            blob_id,
        };

        let sender = tx_context::sender(ctx);
        transfer::transfer(record, sender);
    }

    public fun get_blob_id(record: &MedicalRecord): &String {
        &record.blob_id
    }
}
