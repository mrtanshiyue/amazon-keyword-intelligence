import { persistAcceptedDataset } from './dataset-persistence.js';
import { validateImportBody } from './import-validation.js';

export async function acceptImportedDataset(env, input = {}) {
  const validation = await validateImportBody(input.kind, input.body);
  const persisted = await persistAcceptedDataset(env, {
    datasetId: input.datasetId,
    storeId: input.storeId,
    kind: validation.kind,
    sourceFile: input.sourceFile,
    rowCount: validation.rowCount,
    byteSize: validation.byteSize,
    contentSha256: validation.contentSha256,
    body: input.body,
  });

  return {
    ...persisted,
    reportType: validation.reportType,
    fieldCount: validation.fieldCount,
  };
}
