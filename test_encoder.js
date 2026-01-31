import { encodeMedicalDataset, computeDatasetRoot } from "./utils/encodeMedicalDataset.js";

const encoded = encodeMedicalDataset("data/medical_dataset.json");
const root = computeDatasetRoot(encoded);

console.log("Encoded records:");
console.log(encoded);

console.log("Dataset root:");
console.log(root);
