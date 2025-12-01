pragma circom 2.1.4;

include "../node_modules/circomlib/circuits/poseidon.circom";

// Simple circuit:
// - private input: preimage
// - public output: hash = Poseidon(preimage)

template PoseidonHash() {
    signal input preimage;   // private input
    signal output hash;      // public output

    component hasher = Poseidon(1);

    hasher.inputs[0] <== preimage;
    hash <== hasher.out;
}

component main = PoseidonHash();
