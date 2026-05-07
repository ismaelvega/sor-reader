/**
 * TypeScript type definitions for all SOR parsed data structures.
 * These mirror the nested dict structure produced by pyOTDR's sorparse().
 */

// ── Block metadata ────────────────────────────────────────────────────────────

export interface BlockInfo {
  name: string;
  version: string;
  size: number;
  pos: number;
  order: number;
}

export interface MapBlockInfo {
  nbytes: number;
  nblocks: number;
}

export interface GenParamsRaw {
  language: string;
  "cable ID": string;
  "fiber ID": string;
  /** v2 only */
  "fiber type"?: string;
  wavelength: string;
  "location A": string;
  "location B": string;
  "cable code/fiber type": string;
  "build condition": string;
  "user offset": string;
  /** v2 only */
  "user offset distance"?: string;
  operator: string;
  comments: string;
}

export interface SupParamsRaw {
  supplier: string;
  OTDR: string;
  "OTDR S/N": string;
  module: string;
  "module S/N": string;
  software: string;
  other: string;
}

/**
 * Raw output that mirrors the exact keys and value formats of pyOTDR's
 * FxdParams dictionary, for byte-identical JSON output.
 */
export interface FxdParamsRaw {
  "date/time": string;
  unit: string;
  wavelength: string;
  "acquisition offset": number;
  /** v2 only */
  "acquisition offset distance"?: number;
  "number of pulse width entries": number;
  "pulse width": string;
  "sample spacing": string;
  "num data points": number;
  index: string;
  BC: string;
  "num averages": number;
  /** v2 only: "15 sec" */
  "averaging time"?: string;
  range: number;
  /** v2 only */
  "acquisition range distance"?: number;
  "front panel offset": number;
  "noise floor level": number;
  "noise floor scaling factor": number;
  "power offset first point": number;
  "loss thr": string;
  "refl thr": string;
  "EOT thr": string;
  /** v2 only: e.g. "ST[standard trace]" */
  "trace type"?: string;
  /** v2 only */
  X1?: number;
  Y1?: number;
  X2?: number;
  Y2?: number;
  // Computed fields
  resolution: number;
}

export interface KeyEventRaw {
  type: string;
  distance: string;
  slope: string;
  "splice loss": string;
  "refl loss": string;
  comments: string;
  // v2 only:
  "end of prev"?: string;
  "start of curr"?: string;
  "end of curr"?: string;
  "start of next"?: string;
  peak?: string;
}

export interface KeyEventsSummaryRaw {
  "total loss": number;
  ORL: number;
  "loss start": number;
  "loss end": number;
  "ORL start": number;
  "ORL finish": number;
}

export interface KeyEventsRaw {
  "num events": number;
  [key: string]: KeyEventRaw | KeyEventsSummaryRaw | number;
  Summary: KeyEventsSummaryRaw;
}

export interface DataPtsRaw {
  "num data points": number;
  "num traces": number;
  "num data points 2": number;
  "scaling factor": number;
  "max before offset": number;
  "min before offset": number;
  "_datapts_params": {
    offset: "STV" | "AFL";
    xscaling: number;
  };
}

export interface TracePoint {
  /** distance in km */
  distance: number;
  /** power level in dB */
  power: number;
}

export interface DataPtsResult {
  info: DataPtsRaw;
  trace: TracePoint[];
}

export interface CksumRaw {
  checksum: number;
  checksum_ours: number;
  match: boolean;
}

// ── Checksum ──────────────────────────────────────────────────────────────────

export interface ChecksumInfo {
  /** CRC16-CCITT value stored in the file */
  stored: number;
  /** CRC16-CCITT value we calculated */
  calculated: number;
  /** true if stored === calculated */
  valid: boolean;
}

// ── Vendor block ──────────────────────────────────────────────────────────────

/**
 * Raw bytes and metadata for an unrecognised (vendor-specific) block.
 * Bytes are always fully read so the CRC accumulator stays correct.
 */
export interface VendorBlock {
  name: string;
  version: string;
  /** Raw block bytes (including the block-name header for v2, if present) */
  bytes: Uint8Array;
}

// ── Parse options ─────────────────────────────────────────────────────────────

/**
 * Called for every unrecognised block before falling back to the default
 * slurp behaviour. Return a parsed value (any type) to store it in
 * `SorResult.vendorBlocks`, or `undefined` to use the default raw bytes.
 */
export type VendorBlockParser = (
  block: VendorBlock,
  format: 1 | 2,
) => unknown;

export interface ParseOptions {
  /**
   * Offset method for trace data conversion.
   * - "STV" (default): minimum reading shifted to zero (ymax - raw)
   * - "AFL": maximum reading shifted to zero (ymin - raw)
   */
  offsetMethod?: "STV" | "AFL";
  /**
   * X-axis scaling factor for trace data. Normally 1.
   * Set to 0.1 automatically for Noyes/AFL OFL250 OTDR model.
   */
  xScaling?: number;
  /**
   * Registry of custom parsers for vendor-specific blocks.
   * Keys are block names (e.g. "HPEvent", "WaveMap").
   * If a parser returns `undefined`, the raw VendorBlock is stored instead.
   */
  vendorParsers?: Record<string, VendorBlockParser>;
}