module zkp_walrus::ZKRecord {

    use std::string::String;
    use sui::object::{UID, new};
    use sui::tx_context::{TxContext, sender};
    use sui::transfer;

    /// A simple Sui object storing a Walrus Blob ID.
    public struct TestRecord has key {
        id: UID,
        blob_id: String
    }

    /// Creates a new on-chain record that stores the Walrus Blob ID.
    public entry fun create(
        blob_id: String,
        ctx: &mut TxContext
    ) {
        // Create a fresh UID for the new object
        let uid = new(ctx);

        // Create the object
        let record = TestRecord {
            id: uid,
            blob_id: blob_id
        };

        // Transfer the new object to the sender
        transfer::transfer(record, sender(ctx));
    }

    /// Allows reading the blob ID
    public fun get_blob_id(record: &TestRecord): &String {
        &record.blob_id
    }
}
