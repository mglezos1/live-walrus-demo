/**
 * Poseidon hash using circomlibjs
 * Works on Node 18 with no ESM issues.
 */

const circomlib = require("circomlibjs");

let poseidonInstance = null;

async function poseidonHash(inputs) {
    if (!poseidonInstance) {
        poseidonInstance = await circomlib.buildPoseidon();
    }

    const bigInputs = inputs.map(x => BigInt(x));
    const hash = poseidonInstance(bigInputs);

    return poseidonInstance.F.toString(hash);
}

module.exports = poseidonHash;
