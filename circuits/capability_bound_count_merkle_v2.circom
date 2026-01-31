pragma circom 2.1.4;

include "./poseidon2.circom";

template EnforceEqual() {
    signal input a;
    signal input b;
    a === b;
}

template CapabilityBoundCountMerkleV2() {

    // -------- PUBLIC INPUTS --------
    signal input datasetIdHash;
    signal input queryType;
    signal input datasetRoot;

    // -------- PRIVATE CAPABILITY --------
    signal input capabilityDatasetIdHash;
    signal input capabilityAllowedQuery;

    // -------- DATA --------
    signal input values[10];

    // -------- CAPABILITY CHECKS --------
    component d = EnforceEqual();
    d.a <== datasetIdHash;
    d.b <== capabilityDatasetIdHash;

    component q = EnforceEqual();
    q.a <== queryType;
    q.b <== capabilityAllowedQuery;

    // -------- HASH LEAVES --------
    signal leafHashes[10];
    component leafHashers[10];

    for (var i = 0; i < 10; i++) {
        leafHashers[i] = Poseidon(1);
        leafHashers[i].inputs[0] <== values[i];
        leafHashes[i] <== leafHashers[i].out;
    }

    // -------- MERKLE ROOT (PAIRWISE) --------
    signal level1[5];
    component h1[5];

    for (var i = 0; i < 5; i++) {
        h1[i] = Poseidon(2);
        h1[i].inputs[0] <== leafHashes[2 * i];
        h1[i].inputs[1] <== leafHashes[2 * i + 1];
        level1[i] <== h1[i].out;
    }

    signal level2[3];
    component h2[3];

    h2[0] = Poseidon(2);
    h2[0].inputs[0] <== level1[0];
    h2[0].inputs[1] <== level1[1];
    level2[0] <== h2[0].out;

    h2[1] = Poseidon(2);
    h2[1].inputs[0] <== level1[2];
    h2[1].inputs[1] <== level1[3];
    level2[1] <== h2[1].out;

    h2[2] = Poseidon(2);
    h2[2].inputs[0] <== level1[4];
    h2[2].inputs[1] <== 0;
    level2[2] <== h2[2].out;

    signal level3[2];
    component h3[2];

    h3[0] = Poseidon(2);
    h3[0].inputs[0] <== level2[0];
    h3[0].inputs[1] <== level2[1];
    level3[0] <== h3[0].out;

    h3[1] = Poseidon(2);
    h3[1].inputs[0] <== level2[2];
    h3[1].inputs[1] <== 0;
    level3[1] <== h3[1].out;

    component rootHasher = Poseidon(2);
    rootHasher.inputs[0] <== level3[0];
    rootHasher.inputs[1] <== level3[1];

    rootHasher.out === datasetRoot;

    // -------- COUNT --------
    signal acc[11];
    acc[0] <== 0;

    for (var i = 0; i < 10; i++) {
        acc[i + 1] <== acc[i] + values[i];
    }

    signal output result;
    result <== acc[10];
}

component main = CapabilityBoundCountMerkleV2();
