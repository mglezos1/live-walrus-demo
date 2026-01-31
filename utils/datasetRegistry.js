// In-memory dataset registry (temporary, pre-Walrus)

const datasets = new Map();

/*
Dataset shape:
{
  datasetId: string,
  datasetIdHash: number,
  datasetRoot: string,
  values: number[]
}
*/

export function registerDataset(dataset) {
  datasets.set(dataset.datasetId, dataset);
  return dataset;
}

export function getDataset(datasetId) {
  return datasets.get(datasetId);
}

export function listDatasets() {
  return Array.from(datasets.values()).map(d => ({
    datasetId: d.datasetId,
    datasetRoot: d.datasetRoot,
    recordCount: d.values.length
  }));
}
