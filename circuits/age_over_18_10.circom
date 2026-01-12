pragma circom 2.1.4;

include "circomlib/circuits/comparators.circom";

// Proves: for i in [0..N-1], ages[i] >= 18
template AgeOver18(N) {
    signal input ages[N];      // PRIVATE
    signal input datasetHash;  // PUBLIC (marked public in main)

    component lt[N];

    for (var i = 0; i < N; i++) {
        lt[i] = LessThan(8);   // 8 bits => ages must be < 256
        lt[i].in[0] <== ages[i];
        lt[i].in[1] <== 18;

        // If ages[i] < 18 then lt[i].out = 1. We require 0.
        lt[i].out === 0;
    }
}

component main { public [datasetHash] } = AgeOver18(10);
