/**
 * FxdParams block parser — mirrors fxdparams.py.
 *
 * Contains the physical measurement parameters: timestamp, wavelength, sample
 * spacing, data points count, index of refraction, thresholds, etc.
 *
 * Also computes:
 *   resolution  = sample_spacing_usec * SOL / IOR * 1000  (meters per sample)
 *   range       = resolution / 1000 * num_data_points     (km)
 *
 * v1: 18 fields, 54 bytes
 * v2: 24 fields, 82 bytes
 */

import { BinaryReader } from "./reader.js";
import { BlockInfo } from "./types.js";
import { SOL, UNIT_MAP, TRACE_TYPE_MAP } from "./constants.js";
import { InvalidBlockError, MissingBlockError } from "./errors.js";

const BLOCK_NAME = "FxdParams";

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

/** Format a UTC timestamp to match Python's strftime("%a %b %d %H:%M:%S %Y") */
function formatDateTime(unixSec: number): string {
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
                  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const d = new Date(unixSec * 1000);
  const dayName = days[d.getUTCDay()]!;
  const monthName = months[d.getUTCMonth()]!;
  const day = String(d.getUTCDate()).padStart(2, "0");
  const hours = String(d.getUTCHours()).padStart(2, "0");
  const mins = String(d.getUTCMinutes()).padStart(2, "0");
  const secs = String(d.getUTCSeconds()).padStart(2, "0");
  const year = d.getUTCFullYear();
  return `${dayName} ${monthName} ${day} ${hours}:${mins}:${secs} ${year} (${unixSec} sec)`;
}

/**
 * Format a fixed-decimal number, correctly handling negative zero.
 * Python's "%.Nf" % -0.0 produces "-0.000"; JS's (-0).toFixed(N) produces "0.000".
 */
function fmtFixed(val: number, decimals: number): string {
  // Detect negative zero: val === 0 and 1/val === -Infinity
  if (val === 0 && 1 / val === -Infinity) {
    return "-" + (0).toFixed(decimals);
  }
  return val.toFixed(decimals);
}

export function parseFxdParams(
  reader: BinaryReader,
  blocks: Record<string, BlockInfo>,
  format: 1 | 2,
): FxdParamsRaw {
  const blockInfo = blocks[BLOCK_NAME];
  if (!blockInfo) throw new MissingBlockError(BLOCK_NAME);

  reader.seek(blockInfo.pos);

  if (format === 2) {
    const header = reader.getString();
    if (header !== BLOCK_NAME) throw new InvalidBlockError(BLOCK_NAME, header);
  }

  const result: Partial<FxdParamsRaw> = {};

  // ── date/time: uint32 Unix timestamp ────────────────────────────────────
  const timestamp = reader.getUint(4);
  result["date/time"] = formatDateTime(timestamp);

  // ── unit: 2-byte string, e.g. "mt", "km" ─────────────────────────────
  const unitCode = reader.getRawString(2);
  const unitLabel = UNIT_MAP[unitCode] ?? unitCode;
  result["unit"] = `${unitCode} (${unitLabel})`;

  // ── wavelength: uint16 × 0.1 nm ─────────────────────────────────────
  const wavelengthRaw = reader.getUint(2);
  result["wavelength"] = `${(wavelengthRaw * 0.1).toFixed(1)} nm`;

  // ── acquisition offset: signed int32 ────────────────────────────────
  result["acquisition offset"] = reader.getSigned(4);

  // ── v2 only: acquisition offset distance ────────────────────────────
  if (format === 2) {
    result["acquisition offset distance"] = reader.getSigned(4);
  }

  // ── number of pulse width entries: uint16 ────────────────────────────
  const numPwEntries = reader.getUint(2);
  result["number of pulse width entries"] = numPwEntries;

  // Mirrors pyOTDR: read all pulse widths; result keeps the last value
  // (Multi-PW files contain one PW per pulse width entry; spacing/ndp follow)
  let pulseWidthRaw = 0;
  for (let i = 0; i < numPwEntries; i++) {
    pulseWidthRaw = reader.getUint(2);
  }
  result["pulse width"] = `${pulseWidthRaw.toFixed(0)} ns`;

  // ── sample spacing: uint32 × 1e-8 usec ──────────────────────────────
  const sampleSpacingRaw = reader.getUint(4);
  const sampleSpacingUsec = sampleSpacingRaw * 1e-8;
  // Match Python str(float) representation
  result["sample spacing"] = `${sampleSpacingUsec} usec`;

  // ── num data points: uint32 ──────────────────────────────────────────
  const numDataPoints = reader.getUint(4);
  result["num data points"] = numDataPoints;

  // ── index of refraction: uint32 × 1e-5, formatted %.6f ──────────────
  const iorRaw = reader.getUint(4);
  const ior = iorRaw * 1e-5;
  result["index"] = ior.toFixed(6);

  // ── backscattering coefficient: uint16 × -0.1 dB, formatted %.2f ────
  const bcRaw = reader.getUint(2);
  const bcVal = bcRaw * -0.1;
  result["BC"] = `${fmtFixed(bcVal, 2)} dB`;

  // ── num averages: uint32 ─────────────────────────────────────────────
  result["num averages"] = reader.getUint(4);

  // ── v2 only: averaging time: uint16 × 0.1 sec ───────────────────────
  if (format === 2) {
    const avgTimeRaw = reader.getUint(2);
    result["averaging time"] = `${(avgTimeRaw * 0.1).toFixed(0)} sec`;
  }

  // ── range: uint32 × 2e-5 km (will be overwritten by computed value) ──
  reader.getUint(4); // read and discard; we compute range from IOR + sample spacing

  // ── v2 only: acquisition range distance: signed int32 ───────────────
  if (format === 2) {
    result["acquisition range distance"] = reader.getSigned(4);
  }

  // ── front panel offset: signed int32 ────────────────────────────────
  result["front panel offset"] = reader.getSigned(4);

  // ── noise floor level: uint16 ────────────────────────────────────────
  result["noise floor level"] = reader.getUint(2);

  // ── noise floor scaling factor: signed int16 ────────────────────────
  result["noise floor scaling factor"] = reader.getSigned(2);

  // ── power offset first point: uint16 ────────────────────────────────
  result["power offset first point"] = reader.getUint(2);

  // ── loss threshold: uint16 × 0.001 dB, formatted %.3f ───────────────
  const lossThrRaw = reader.getUint(2);
  result["loss thr"] = `${fmtFixed(lossThrRaw * 0.001, 3)} dB`;

  // ── reflection threshold: uint16 × -0.001 dB, formatted %.3f ────────
  const reflThrRaw = reader.getUint(2);
  result["refl thr"] = `${fmtFixed(reflThrRaw * -0.001, 3)} dB`;

  // ── EOT threshold: uint16 × 0.001 dB, formatted %.3f ────────────────
  const eotThrRaw = reader.getUint(2);
  result["EOT thr"] = `${fmtFixed(eotThrRaw * 0.001, 3)} dB`;

  // ── v2 only: trace type (2-byte string) ─────────────────────────────
  if (format === 2) {
    const traceCode = reader.getRawString(2);
    const traceLabel = TRACE_TYPE_MAP[traceCode] ?? "";
    result["trace type"] = traceLabel ? `${traceCode}[${traceLabel}]` : traceCode;
  }

  // ── v2 only: X1, Y1, X2, Y2 (signed int32 each) ─────────────────────
  if (format === 2) {
    result["X1"] = reader.getSigned(4);
    result["Y1"] = reader.getSigned(4);
    result["X2"] = reader.getSigned(4);
    result["Y2"] = reader.getSigned(4);
  }

  // ── Consume remaining bytes in block to keep CRC valid ───────────────
  const consumed = reader.tell() - blockInfo.pos;
  const remaining = blockInfo.size - consumed;
  if (remaining > 0) reader.skip(remaining);

  // ── Compute adjusted range and resolution using index of refraction ──
  const dx = sampleSpacingUsec * SOL / ior; // km per sample
  const resolution = dx * 1000.0; // meters per sample
  const range = dx * numDataPoints; // total range in km

  result["range"] = range;
  result["resolution"] = resolution;

  return result as FxdParamsRaw;
}
