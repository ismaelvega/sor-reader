/**
 * DataPts block parser — mirrors datapts.py.
 *
 * Reads N × uint16 raw trace samples and converts them to (distance, power) pairs.
 *
 * Conversion:
 *   power_dB = (ymax - raw) × 0.001 × scalingFactor    [STV method, default]
 *   distance_km = resolution_m × i × xScaling / 1000
 *
 * Special case: Noyes/AFL OFL250 has x-axis off by factor 10 (xScaling = 0.1).
 */

import { BinaryReader } from "./reader.js";
import { BlockInfo, DataPtsResult, FxdParamsRaw, SupParamsRaw, TracePoint } from "./types.js";
import { InvalidBlockError, MissingBlockError, UnsupportedFeatureError } from "./errors.js";

const BLOCK_NAME = "DataPts";

export function parseDataPts(
  reader: BinaryReader,
  blocks: Record<string, BlockInfo>,
  format: 1 | 2,
  fxdParams: FxdParamsRaw,
  supParams: SupParamsRaw,
): DataPtsResult {
  const blockInfo = blocks[BLOCK_NAME];
  if (!blockInfo) throw new MissingBlockError(BLOCK_NAME);

  reader.seek(blockInfo.pos);

  if (format === 2) {
    const header = reader.getString();
    if (header !== BLOCK_NAME) throw new InvalidBlockError(BLOCK_NAME, header);
  }

  // ── Determine offset method and x-scaling ─────────────────────────────
  let xscaling = 1;
  // Noyes/AFL OFL250 has a known x-axis bug: off by factor 10
  if (supParams.OTDR === "OFL250") {
    xscaling = 0.1;
  }

  const offsetMethod: "STV" | "AFL" = "STV"; // default

  // ── Header ───────────────────────────────────────────────────────────
  const N = reader.getUint(4);
  if (N !== fxdParams["num data points"]) {
    // Log warning but continue — pyOTDR does the same
    console.warn(
      `DataPts: block says N=${N} but FxdParams says ${fxdParams["num data points"]}`,
    );
  }

  const numTraces = reader.getSigned(2);
  if (numTraces > 1) {
    throw new UnsupportedFeatureError(`Multiple traces (${numTraces}) are not supported`);
  }

  const N2 = reader.getUint(4); // confirmation of N
  const scalingFactorRaw = reader.getUint(2);
  const scalingFactor = scalingFactorRaw / 1000.0;

  // ── Read raw trace samples ────────────────────────────────────────────
  const raw = new Uint16Array(N);
  for (let i = 0; i < N; i++) {
    raw[i] = reader.getUint(2);
  }

  let ymax = 0;
  let ymin = 65535;
  for (let i = 0; i < N; i++) {
    const v = raw[i]!;
    if (v > ymax) ymax = v;
    if (v < ymin) ymin = v;
  }

  const fs = 0.001 * scalingFactor;
  const maxBeforeOffset = parseFloat((ymax * fs).toFixed(3));
  const minBeforeOffset = parseFloat((ymin * fs).toFixed(3));

  // ── Convert to dB ─────────────────────────────────────────────────────
  const dx = fxdParams.resolution; // meters per sample

  const trace: TracePoint[] = new Array(N);

  for (let i = 0; i < N; i++) {
    const v = raw[i]!;
    let power: number;
    if (offsetMethod === "STV") {
      power = (ymax - v) * fs;
    } else if (offsetMethod === "AFL") {
      power = (ymin - v) * fs;
    } else {
      power = -v * fs;
    }

    // Match pyOTDR's exact format: {:f}\t{:f}
    // Python's {:f} uses 6 decimal places
    const x = (dx * i * xscaling) / 1000.0; // km
    trace[i] = { distance: x, power };
  }

  // ── Consume remaining bytes ───────────────────────────────────────────
  const consumed = reader.tell() - blockInfo.pos;
  const remaining = blockInfo.size - consumed;
  if (remaining > 0) reader.skip(remaining);

  return {
    info: {
      "num data points": N,
      "num traces": numTraces,
      "num data points 2": N2,
      "scaling factor": scalingFactor,
      "max before offset": maxBeforeOffset,
      "min before offset": minBeforeOffset,
      "_datapts_params": {
        offset: offsetMethod,
        xscaling,
      },
    },
    trace,
  };
}

/**
 * Format trace data as tab-separated distance/power string,
 * matching pyOTDR's {:f}\t{:f}\n format (Python's default %f = 6 decimal places).
 */
export function traceToString(trace: TracePoint[]): string {
  return trace.map((p) => `${p.distance.toFixed(6)}\t${p.power.toFixed(6)}\n`).join("");
}
