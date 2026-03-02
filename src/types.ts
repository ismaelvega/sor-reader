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

// ── GenParams ─────────────────────────────────────────────────────────────────

export interface GenParamsV1 {
  language: string;
  /** "cable ID" */
  cableId: string;
  /** "fiber ID" */
  fiberId: string;
  /** e.g. "1310 nm" */
  wavelength: string;
  /** "location A" */
  locationA: string;
  /** "location B" */
  locationB: string;
  /** "cable code/fiber type" */
  cableCode: string;
  /** "build condition", e.g. "CC (as-current)" */
  buildCondition: string;
  /** "user offset" (signed int32 as string) */
  userOffset: string;
  operator: string;
  comments: string;
}

export interface GenParamsV2 extends GenParamsV1 {
  /** "fiber type", e.g. "G.652 (standard SMF)" — v2 only */
  fiberType: string;
  /** "user offset distance" (signed int32 as string) — v2 only */
  userOffsetDistance: string;
}

export type GenParams = GenParamsV1 | GenParamsV2;

// ── SupParams ─────────────────────────────────────────────────────────────────

export interface SupParams {
  supplier: string;
  /** OTDR model name */
  otdr: string;
  /** "OTDR S/N" */
  otdrSerialNumber: string;
  /** module name */
  module: string;
  /** "module S/N" */
  moduleSerialNumber: string;
  software: string;
  other: string;
}

// ── FxdParams ─────────────────────────────────────────────────────────────────

export interface FxdParamsV1 {
  /** ISO date string representation */
  dateTime: string;
  /** Raw Unix timestamp in seconds */
  dateTimeRaw: number;
  /** e.g. "mt (meters)" */
  unit: string;
  /** e.g. "1310.0 nm" */
  wavelength: string;
  acquisitionOffset: number;
  pulseWidthEntries: number;
  /** e.g. "1000 ns" */
  pulseWidth: string;
  /** sample spacing in microseconds */
  sampleSpacing: number;
  numDataPoints: number;
  /** index of refraction, e.g. 1.471100 */
  indexOfRefraction: number;
  /** backscattering coefficient, e.g. "-81.50 dB" */
  backscatterCoeff: string;
  numAverages: number;
  /** computed range in km */
  range: number;
  /** computed resolution in meters per sample */
  resolution: number;
  frontPanelOffset: number;
  noiseFloorLevel: number;
  noiseFloorScalingFactor: number;
  powerOffsetFirstPoint: number;
  /** e.g. "0.000 dB" */
  lossThreshold: string;
  /** e.g. "-0.000 dB" */
  reflThreshold: string;
  /** e.g. "5.000 dB" */
  eotThreshold: string;
}

export interface FxdParamsV2 extends FxdParamsV1 {
  acquisitionOffsetDistance: number;
  /** e.g. "15 sec" — v2 only */
  averagingTime: string;
  acquisitionRangeDistance: number;
  /** e.g. "ST[standard trace]" — v2 only */
  traceType: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export type FxdParams = FxdParamsV1 | FxdParamsV2;

// ── KeyEvents ─────────────────────────────────────────────────────────────────

export interface KeyEventV1 {
  /** e.g. "1F9999LS {auto} reflection" */
  type: string;
  /** distance in km as 3-decimal string (matches pyOTDR format) */
  distance: string;
  /** dB/km as 3-decimal string */
  slope: string;
  /** dB as 3-decimal string */
  spliceLoss: string;
  /** dB as 3-decimal string */
  reflLoss: string;
  comments: string;
}

export interface KeyEventV2 extends KeyEventV1 {
  endOfPrev: string;
  startOfCurr: string;
  endOfCurr: string;
  startOfNext: string;
  peak: string;
}

export type KeyEvent = KeyEventV1 | KeyEventV2;

export interface KeyEventsSummary {
  totalLoss: number;
  orl: number;
  lossStart: number;
  lossEnd: number;
  orlStart: number;
  orlFinish: number;
}

export interface KeyEvents {
  numEvents: number;
  events: KeyEvent[];
  summary: KeyEventsSummary;
}

// ── DataPts ───────────────────────────────────────────────────────────────────

export interface DataPtsInfo {
  numDataPoints: number;
  numTraces: number;
  scalingFactor: number;
  maxBeforeOffset: number;
  minBeforeOffset: number;
}

export interface TracePoint {
  /** distance in km */
  distance: number;
  /** power level in dB */
  power: number;
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

// ── Top-level result ──────────────────────────────────────────────────────────

export interface SorData {
  filename: string;
  /** 1 = Bellcore 1.x, 2 = Bellcore 2.x */
  format: 1 | 2;
  /** e.g. "1.00" or "2.00" */
  version: string;
  mapBlock: MapBlockInfo;
  blocks: Record<string, BlockInfo>;
  genParams: GenParams;
  supParams: SupParams;
  fxdParams: FxdParams;
  keyEvents: KeyEvents;
  dataPts: DataPtsInfo;
  checksum: ChecksumInfo;
  trace: TracePoint[];
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
