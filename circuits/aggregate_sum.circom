pragma circom 2.1.4;

/**
 * Aggregate Sum Circuit
 * Sums field values from records
 * 
 * Inputs:
 * - values[N]: Array of field values to sum
 * 
 * Outputs:
 * - sum: Total sum of values
 */
template AggregateSum(N) {
    signal input values[N];
    signal output sum;

    signal accumulator[N + 1];
    accumulator[0] <== 0;

    for (var i = 0; i < N; i++) {
        accumulator[i + 1] <== accumulator[i] + values[i];
    }

    sum <== accumulator[N];
}

component main = AggregateSum(10);
