pragma circom 2.1.4;

/*
  Capability-bound count circuit (standalone, fixed)

  - Enforces capability == dataset + query
  - Counts 10 values
  - Avoids double signal assignment
*/

template EnforceEqual() {
    signal input a;
    signal input b;
    a === b;
}

/*
  Correct count implementation using intermediate signals
*/
template SimpleCount(n) {
    signal input in[n];
    signal output out;

    signal sum[n + 1];
    sum[0] <== 0;

    for (var i = 0; i < n; i++) {
        sum[i + 1] <== sum[i] + in[i];
    }

    out <== sum[n];
}

template CapabilityBoundCountV2() {

    // -------- PUBLIC INPUTS --------
    signal input datasetIdHash;
    signal input queryType;

    // -------- PRIVATE CAPABILITY --------
    signal input capabilityDatasetIdHash;
    signal input capabilityAllowedQuery;

    // -------- DATA INPUTS --------
    signal input values[10];

    // -------- CAPABILITY CHECKS --------
    component d = EnforceEqual();
    d.a <== datasetIdHash;
    d.b <== capabilityDatasetIdHash;

    component q = EnforceEqual();
    q.a <== queryType;
    q.b <== capabilityAllowedQuery;

    // -------- COUNT --------
    component counter = SimpleCount(10);
    for (var i = 0; i < 10; i++) {
        counter.in[i] <== values[i];
    }

    // -------- OUTPUT --------
    signal output result;
    result <== counter.out;
}

component main = CapabilityBoundCountV2();
