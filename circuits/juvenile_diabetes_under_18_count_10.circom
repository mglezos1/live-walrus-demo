pragma circom 2.1.6;

include "circomlib/circuits/comparators.circom";

template JuvenileDiabetesUnder18Count(n) {
    // Private inputs
    signal input ages[n];
    signal input conditions[n];
    // conditions[i] = 1 if juvenile_diabetes, else 0

    // Public output
    signal output count;

    component lt18[n];
    signal qualifies[n];

    signal sum[n + 1];
    sum[0] <== 0;

    for (var i = 0; i < n; i++) {

        // age < 18
        lt18[i] = LessThan(8);
        lt18[i].in[0] <== ages[i];
        lt18[i].in[1] <== 18;

        // qualifies if under 18 AND juvenile diabetes
        qualifies[i] <== lt18[i].out * conditions[i];

        // accumulate safely
        sum[i + 1] <== sum[i] + qualifies[i];
    }

    count <== sum[n];
}

component main = JuvenileDiabetesUnder18Count(10);
