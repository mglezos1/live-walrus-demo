pragma circom 2.1.4;

include "../node_modules/circomlib/circuits/comparators.circom";

/**
 * Range Sum Circuit
 * Sums values within a range
 * 
 * Inputs:
 * - values[N]: Array of field values
 * - min_value: Minimum value (inclusive)
 * - max_value: Maximum value (inclusive)
 * 
 * Outputs:
 * - sum: Sum of values in range
 */
template RangeSum(N) {
    signal input values[N];
    signal input min_value;
    signal input max_value;
    signal output sum;

    component lt_min[N];
    component lt_max[N];
    
    signal in_range[N];
    signal weighted_values[N];
    signal accumulator[N + 1];
    accumulator[0] <== 0;

    for (var i = 0; i < N; i++) {
        // Check if value >= min_value
        lt_min[i] = LessThan(32);
        lt_min[i].in[0] <== values[i];
        lt_min[i].in[1] <== min_value;
        
        // Check if value <= max_value
        lt_max[i] = LessThan(32);
        lt_max[i].in[0] <== max_value;
        lt_max[i].in[1] <== values[i];
        
        // Value is in range if: value >= min_value AND value <= max_value
        in_range[i] <== (1 - lt_min[i].out) * (1 - lt_max[i].out);
        
        // Multiply value by in_range flag (0 if out of range, value if in range)
        weighted_values[i] <== values[i] * in_range[i];
        
        accumulator[i + 1] <== accumulator[i] + weighted_values[i];
    }

    sum <== accumulator[N];
}

component main = RangeSum(10);
