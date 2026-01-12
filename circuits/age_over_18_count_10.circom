pragma circom 2.0.0;

include "circomlib/circuits/comparators.circom";

template AgeOver18Count(N) {
    signal input ages[N];
    signal output count;

    signal passes[N];

    component lt[N];

    for (var i = 0; i < N; i++) {
        // lt[i] = (ages[i] < 18)
        lt[i] = LessThan(8);   // 8 bits is enough for age
        lt[i].in[0] <== ages[i];
        lt[i].in[1] <== 18;

        // passes[i] = NOT (ages[i] < 18)
        passes[i] <== 1 - lt[i].out;
    }

    // Sum all passes
    var sum = 0;
    for (var i = 0; i < N; i++) {
        sum += passes[i];
    }

    count <== sum;
}

component main = AgeOver18Count(10);
