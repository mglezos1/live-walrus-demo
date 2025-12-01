pragma circom 2.1.4;

include "../node_modules/circomlib/circuits/poseidon.circom";

// Poseidon hash with dynamic n inputs (up to 16)
template Poseidon2(n) {
    signal input in[n];
    signal output out;

    component p = Poseidon(n);
    for (var i = 0; i < n; i++) {
        p.inputs[i] <== in[i];
    }

    out <== p.out;
}
