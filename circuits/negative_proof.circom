pragma circom 2.0.0;

include "./poseidon2.circom";
include "./constants.circom";

template NegativeProof() {

    // ==== INPUTS ====
    signal input patientId;       // private
    signal input testNonce;       // private
    signal input actual_result;   // private

    // ==== ENFORCE NEGATIVE RESULT ====
    // Prevent compiler from optimizing away the constraint
    signal check;
    check <== actual_result;
    check === 0;

    // ==== OUTPUT ====
    signal output hash_output;

    // ==== HASHING ====
    component H = Poseidon2(3);

    H.inputs[0] <== patientId;
    H.inputs[1] <== testNonce;
    H.inputs[2] <== actual_result;

    hash_output <== H.out;
}

component main = NegativeProof();
