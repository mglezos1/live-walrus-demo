pragma circom 2.1.4;

/**
 * Aggregate Average Circuit
 * Computes average of field values
 * 
 * Inputs:
 * - values[N]: Array of field values
 * 
 * Outputs:
 * - average: Average of values (sum / N)
 */
template AggregateAvg(N) {
    signal input values[N];
    signal output average;

    signal sum[N + 1];
    sum[0] <== 0;

    for (var i = 0; i < N; i++) {
        sum[i + 1] <== sum[i] + values[i];
    }

    // Divide sum by N
    average <== sum[N] / N;
}

component main = AggregateAvg(10);
