/**
 * Browser-safe entry point for sor-reader.
 *
 * Re-exports everything from the main package EXCEPT parseSorFile,
 * which requires the Node.js `fs` module.
 *
 * Usage in browsers or bundlers:
 *   import { parseSor, toJSON, traceToString } from "sor-reader/browser";
 */
export {
  parseSor,
  toJSON,
  traceToString,
  VERSION,
} from "./index.js";

export type {
  SorResult,
  TracePoint,
  BlockInfo,
  MapBlockInfo,
  ParseOptions,
  VendorBlock,
} from "./index.js";

export * from "./errors.js";
