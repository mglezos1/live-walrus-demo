// hash_real_file.js
const fs = require("fs");
const { poseidon2 } = require("./poseidon2.js");

// Load the real patient JSON
const data = JSON.parse(fs.readFileSync("./input_negative.json", "utf8"));

// CIRCOM NOW USES ONLY TWO INPUTS
const inputs = [
    BigInt(data.patientId),
    BigInt(data.testNonce)
];

const hash = poseidon2(inputs);

console.log("Real-file hash:", hash.toString());
