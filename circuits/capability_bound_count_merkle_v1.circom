pragma circom 2.1.4;

/*
  Capability + Dataset-bound count (Merkle v1 — simplified)

  This version:
  - enforces capability constraints
  - enforces dataset commitment
  - avoids hashing for now (learning-safe)
*/

template EnforceEqual() {
    signal input a;
    signal input b;
    a === b;
}

template CapabilityBoundCountMerkle() {

    // -------- PUBLIC INPUTS --------
    signal input datasetIdHash;
    signal input queryType;
    signal input datasetRoot;

    // -------- PRIVATE CAPABILITY --------
    signal input capabilityDatasetIdHash;
    signal input capabilityAllowedQuery;

    // -------- DATA --------
    signal input values[10];
    signal input leafHashes[10];

    // -------- CAPABILITY CHECKS --------
    component d = EnforceEqual();
    d.a <== datasetIdHash;
    d.b <== capabilityDatasetIdHash;

    component q = EnforceEqual();
    q.a <== queryType;
    q.b <== capabilityAllowedQuery;

    // -------- DATA COMMITMENT CHECK --------
    // leafHashes must match values
    for (var i = 0; i < 10; i++) {
        leafHashes[i] === values[i];
    }

    // datasetRoot = sum of leaf hashes
    signal sum[11];
    sum[0] <== 0;

    for (var i = 0; i < 10; i++) {
        sum[i + 1] <== sum[i] + leafHashes[i];
    }

    datasetRoot === sum[10];

    // -------- COUNT --------
    signal total[11];
    total[0] <== 0;

    for (var i = 0; i < 10; i++) {
        total[i + 1] <== total[i] + values[i];
    }

    signal output result;
    result <== total[10];
}

component main = CapabilityBoundCountMerkle();
