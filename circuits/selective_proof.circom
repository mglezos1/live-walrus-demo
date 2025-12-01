pragma circom 2.0.0;

include "./poseidon2.circom";
include "./constants.circom";

/*
    Optimized selective proof circuit.
    Uses Poseidon2 hash function with correct input wiring.
*/

template SelectiveProof() {

    // ===== PRIVATE INPUTS =====
    signal input patientId;
    signal input testNonce;

    signal input actual_result;      // covidResult

    signal input age;
    signal input hr;

    signal input genderHash;
    signal input addressHash;
    signal input bpHash;
    signal input symptomsHash;

    // ===== PUBLIC OUTPUTS =====
    signal output doctorHash;
    signal output researcherHash;

    // ----- Poseidon components -----

    // Level 1
    component L1 = Poseidon2(2);
    L1.in[0] <== patientId;
    L1.in[1] <== testNonce;

    // Level 2
    component L2 = Poseidon2(2);
    L2.in[0] <== actual_result;
    L2.in[1] <== age;

    // Combine extra fields
    component Combine = Poseidon2(3);
    Combine.in[0] <== hr;
    Combine.in[1] <== bpHash;
    Combine.in[2] <== symptomsHash;

    // Level 3 (root)
    component L3 = Poseidon2(3);
    L3.in[0] <== L1.out;
    L3.in[1] <== L2.out;
    L3.in[2] <== Combine.out;

    doctorHash <== L3.out;

    // Researcher hash (only covid result)
    component R = Poseidon2(1);
    R.in[0] <== actual_result;

    researcherHash <== R.out;
}

component main = SelectiveProof();
