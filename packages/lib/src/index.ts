// @ts-ignore
const natto = window.__NATTO_EXPERIMENTAL;

type FileDirectory = {
  [name: string]: File | FileDirectory;
};

export const openFileDirectory: () => Promise<FileDirectory> =
  natto.openFileDirectory;
export const getURLSearchParams: () => Record<string, string> =
  natto.getURLSearchParams;
