pragma circom 2.1.4;

include "../node_modules/circomlib/circuits/comparators.circom";

/**
 * Aggregate Count Circuit
 * Counts records matching a condition
 * 
 * Inputs:
 * - records[N]: Array of record values (0 or 1 indicating match)
 * 
 * Outputs:
 * - count: Total count of matching records
 */
template AggregateCount(N) {
    signal input records[N];
    signal output count;

    signal sum[N + 1];
    sum[0] <== 0;

    for (var i = 0; i < N; i++) {
        sum[i + 1] <== sum[i] + records[i];
    }

    count <== sum[N];
}

component main = AggregateCount(10);
