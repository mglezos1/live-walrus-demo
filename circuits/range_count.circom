pragma circom 2.1.4;

include "../node_modules/circomlib/circuits/comparators.circom";

/**
 * Range Count Circuit
 * Counts records within a value range
 * 
 * Inputs:
 * - values[N]: Array of field values
 * - min_value: Minimum value (inclusive)
 * - max_value: Maximum value (inclusive)
 * 
 * Outputs:
 * - count: Count of records in range
 */
template RangeCount(N) {
    signal input values[N];
    signal input min_value;
    signal input max_value;
    signal output count;

    component lt_min[N];
    component lt_max[N];
    
    signal in_range[N];
    signal sum[N + 1];
    sum[0] <== 0;

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
        // Which means: NOT (value < min_value) AND NOT (max_value < value)
        in_range[i] <== (1 - lt_min[i].out) * (1 - lt_max[i].out);
        
        sum[i + 1] <== sum[i] + in_range[i];
    }

    count <== sum[N];
}

component main = RangeCount(10);
