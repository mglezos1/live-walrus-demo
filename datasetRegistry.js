import fs from "fs";
import path from "path";

const DATA_DIR = path.resolve("./data");
const DATASET_FILE = path.join(DATA_DIR, "datasets.json");

// --------------------
// LOAD FROM DISK
// --------------------
let datasets = [];

if (fs.existsSync(DATASET_FILE)) {
  const raw = fs.readFileSync(DATASET_FILE, "utf-8");
  datasets = JSON.parse(raw);
} else {
  datasets = [];
}

// --------------------
// SAVE TO DISK
// --------------------
function saveDatasets() {
  fs.writeFileSync(DATASET_FILE, JSON.stringify(datasets, null, 2));
}

// --------------------
// REGISTRY API
// --------------------
export function registerDataset(dataset) {
  datasets.push(dataset);
  saveDatasets();
  return dataset;
}

// Backward / semantic aliases
export function addDataset(dataset) {
  return registerDataset(dataset);
}

export function getDataset(datasetId) {
  return getDatasetById(datasetId);
}

export function getDatasetById(datasetId) {
  return datasets.find(d => d.datasetId === datasetId);
}

export function listDatasets() {
  return datasets;
}
