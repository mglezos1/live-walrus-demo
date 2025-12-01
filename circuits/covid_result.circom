pragma circom 2.1.4;

include "../node_modules/circomlib/circuits/poseidon.circom";

// Private inputs:
//  • patientId
//  • testNonce
//  • result (0 or 1)
//
// Public outputs:
//  • commitment  (Poseidon hash)
//  • claimedResult (revealed result)

template CovidResultProof() {
    // ---- PRIVATE INPUTS ----
    signal input patientId;
    signal input testNonce;
    signal input result;

    // ---- PUBLIC OUTPUTS ----
    signal output commitment;
    signal output claimedResult;

    // Poseidon hash of private values
    component h = Poseidon(3);
    h.inputs[0] <== patientId;
    h.inputs[1] <== testNonce;
    h.inputs[2] <== result;

    // Assign outputs
    commitment <== h.out;
    claimedResult <== result;

    // Safety constraint (optional)
    claimedResult === result;
}

// Instantiate main circuit
component main = CovidResultProof();
