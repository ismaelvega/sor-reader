/**
 * sor-reader — Zero-dependency TypeScript parser for OTDR SOR files.
 *
 * Public API:
 *   parseSor(data, filename?)  → SorResult (all parsed blocks + trace)
 *   parseSorFile(path)         → SorResult  (Node.js only)
 *   traceToString(trace)       → tab-separated .dat string
 *   toJSON(result)             → pyOTDR-compatible JSON string
 *
 * Supports Bellcore/Telcordia SR-4731 v1.x and v2.x.
 * Works in Node.js (Buffer) and browsers (Uint8Array).
 */

import { BinaryReader } from "./reader.js";
import { parseMapBlock } from "./mapblock.js";
import { parseGenParams, GenParamsRaw } from "./genparams.js";
import { parseSupParams, SupParamsRaw } from "./supparams.js";
import { parseFxdParams, FxdParamsRaw } from "./fxdparams.js";
import { parseKeyEvents, KeyEventsRaw } from "./keyevents.js";
import { parseDataPts, DataPtsRaw, traceToString } from "./datapts.js";
import { parseCksum, CksumRaw } from "./cksumblock.js";
import { TracePoint, BlockInfo, MapBlockInfo, VendorBlock } from "./types.js";
import { ParseOptions } from "./types.js";

export * from "./types.js";
export * from "./errors.js";
export { traceToString } from "./datapts.js";

export const VERSION = "1.0.0";

// ── Result type ───────────────────────────────────────────────────────────────

export interface SorResult {
  filename: string;
  format: 1 | 2;
  version: string;
  mapblock: MapBlockInfo;
  blocks: Record<string, BlockInfo>;
  GenParams: GenParamsRaw;
  SupParams: SupParamsRaw;
  FxdParams: FxdParamsRaw;
  KeyEvents: KeyEventsRaw;
  DataPts: DataPtsRaw;
  Cksum: CksumRaw;
  trace: TracePoint[];
  /**
   * Vendor/unknown blocks encountered during parsing.
   * If a `vendorParsers` option was provided for a block name, the parsed
   * value is stored; otherwise a raw `VendorBlock` with bytes is stored.
   */
  vendorBlocks: Record<string, unknown>;
}

// ── Core parser ───────────────────────────────────────────────────────────────

/**
 * Parse a SOR file from a raw byte buffer.
 *
 * Accepts both `Uint8Array` (browser/universal) and Node.js `Buffer`.
 * Processes all blocks in map-declared order so the CRC accumulates correctly.
 * Unknown/vendor blocks are slurped (bytes read and discarded) to maintain CRC.
 *
 * @param data     Raw file bytes
 * @param filename Optional filename to include in the result
 * @param options  Parser options (offset method, x-scaling override)
 */
export function parseSor(
  data: Uint8Array,
  filename = "",
  options: ParseOptions = {},
): SorResult {
  const reader = new BinaryReader(data);
  const { format, version, mapBlock, blocks } = parseMapBlock(reader);

  // Sort blocks by their order in the map (same as pyOTDR's sorted(klist))
  const ordered = Object.values(blocks).sort((a, b) => a.order - b.order);

  // Results accumulate here
  let genParams: GenParamsRaw | undefined;
  let supParams: SupParamsRaw | undefined;
  let fxdParams: FxdParamsRaw | undefined;
  let keyEvents: KeyEventsRaw | undefined;
  let dataPtsInfo: DataPtsRaw | undefined;
  let trace: TracePoint[] = [];
  let cksum: CksumRaw | undefined;
  const vendorBlocks: Record<string, unknown> = {};

  for (const blk of ordered) {
    const name = blk.name;

    switch (name) {
      case "GenParams":
        genParams = parseGenParams(reader, blocks, format);
        break;
      case "SupParams":
        supParams = parseSupParams(reader, blocks, format);
        break;
      case "FxdParams":
        fxdParams = parseFxdParams(reader, blocks, format);
        break;
      case "KeyEvents":
        if (!fxdParams) throw new Error("FxdParams must be parsed before KeyEvents");
        keyEvents = parseKeyEvents(reader, blocks, format, fxdParams);
        break;
      case "DataPts": {
        if (!fxdParams) throw new Error("FxdParams must be parsed before DataPts");
        if (!supParams) throw new Error("SupParams must be parsed before DataPts");
        const dp = parseDataPts(reader, blocks, format, fxdParams, supParams);
        dataPtsInfo = dp.info;
        trace = dp.trace;
        break;
      }
      case "Cksum":
        cksum = parseCksum(reader, blocks, format);
        break;
      default: {
        // Vendor/unknown block: read all bytes to keep CRC valid, then
        // optionally parse via the vendorParsers registry.
        reader.seek(blk.pos);
        const rawBytes = reader.read(blk.size);
        const vendorBlock: VendorBlock = {
          name: blk.name,
          version: blk.version,
          bytes: rawBytes,
        };
        const customParser = options.vendorParsers?.[name];
        vendorBlocks[name] = customParser
          ? (customParser(vendorBlock, format) ?? vendorBlock)
          : vendorBlock;
        break;
      }
    }
  }

  // Required blocks — all SOR files must have these
  if (!genParams) throw new Error("GenParams block not found");
  if (!supParams) throw new Error("SupParams block not found");
  if (!fxdParams) throw new Error("FxdParams block not found");
  if (!keyEvents) throw new Error("KeyEvents block not found");
  if (!dataPtsInfo) throw new Error("DataPts block not found");
  if (!cksum) throw new Error("Cksum block not found");

  return {
    filename,
    format,
    version,
    mapblock: mapBlock,
    blocks,
    GenParams: genParams,
    SupParams: supParams,
    FxdParams: fxdParams,
    KeyEvents: keyEvents,
    DataPts: dataPtsInfo,
    Cksum: cksum,
    trace,
    vendorBlocks,
  };
}

/**
 * Parse a SOR file from a file system path (Node.js only).
 * Throws if called in a browser environment.
 */
export async function parseSorFile(filepath: string, options: ParseOptions = {}): Promise<SorResult> {
  const { readFile } = await import("fs/promises");
  const { basename } = await import("path");
  const buf = await readFile(filepath);
  const filename = basename(filepath);
  return parseSor(new Uint8Array(buf), filename, options);
}

// ── JSON serialisation ────────────────────────────────────────────────────────

/**
 * Serialise a SorResult to a JSON string that is byte-compatible with
 * pyOTDR's output (sorted keys, 8-space indent).
 */
/** Recursively sort all object keys — mirrors Python's json.dumps(sort_keys=True). */
function sortKeysDeep(val: unknown): unknown {
  if (Array.isArray(val)) return val.map(sortKeysDeep);
  if (val !== null && typeof val === "object") {
    return Object.fromEntries(
      Object.entries(val as Record<string, unknown>)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => [k, sortKeysDeep(v)]),
    );
  }
  return val;
}

export function toJSON(result: SorResult): string {
  // Build a plain object that mirrors pyOTDR's results dict exactly
  const out: Record<string, unknown> = {
    filename: result.filename,
    format: result.format,
    version: result.version,
    mapblock: result.mapblock,
    blocks: result.blocks,
    // Block data with pyOTDR key names
    GenParams: buildGenParamsOutput(result.GenParams),
    SupParams: buildSupParamsOutput(result.SupParams),
    FxdParams: buildFxdParamsOutput(result.FxdParams),
    KeyEvents: buildKeyEventsOutput(result.KeyEvents),
    DataPts: buildDataPtsOutput(result.DataPts),
    Cksum: {
      checksum: result.Cksum.checksum,
      checksum_ours: result.Cksum.checksum_ours,
      match: result.Cksum.match,
    },
  };

  return JSON.stringify(sortKeysDeep(out), null, 8);
}

function buildGenParamsOutput(gp: GenParamsRaw): Record<string, unknown> {
  const out: Record<string, unknown> = {
    language: gp.language,
    "cable ID": gp["cable ID"],
    "fiber ID": gp["fiber ID"],
    wavelength: gp.wavelength,
    "location A": gp["location A"],
    "location B": gp["location B"],
    "cable code/fiber type": gp["cable code/fiber type"],
    "build condition": gp["build condition"],
    "user offset": gp["user offset"],
    operator: gp["operator"],
    comments: gp.comments,
  };
  if (gp["fiber type"] !== undefined) out["fiber type"] = gp["fiber type"];
  if (gp["user offset distance"] !== undefined) out["user offset distance"] = gp["user offset distance"];
  return out;
}

function buildSupParamsOutput(sp: SupParamsRaw): Record<string, unknown> {
  return {
    supplier: sp.supplier,
    OTDR: sp.OTDR,
    "OTDR S/N": sp["OTDR S/N"],
    module: sp.module,
    "module S/N": sp["module S/N"],
    software: sp.software,
    other: sp.other,
  };
}

function buildFxdParamsOutput(fp: FxdParamsRaw): Record<string, unknown> {
  const out: Record<string, unknown> = {
    "date/time": fp["date/time"],
    unit: fp.unit,
    wavelength: fp.wavelength,
    "acquisition offset": fp["acquisition offset"],
    "number of pulse width entries": fp["number of pulse width entries"],
    "pulse width": fp["pulse width"],
    "sample spacing": fp["sample spacing"],
    "num data points": fp["num data points"],
    index: fp.index,
    BC: fp.BC,
    "num averages": fp["num averages"],
    range: fp.range,
    "front panel offset": fp["front panel offset"],
    "noise floor level": fp["noise floor level"],
    "noise floor scaling factor": fp["noise floor scaling factor"],
    "power offset first point": fp["power offset first point"],
    "loss thr": fp["loss thr"],
    "refl thr": fp["refl thr"],
    "EOT thr": fp["EOT thr"],
    resolution: fp.resolution,
  };
  if (fp["acquisition offset distance"] !== undefined)
    out["acquisition offset distance"] = fp["acquisition offset distance"];
  if (fp["averaging time"] !== undefined)
    out["averaging time"] = fp["averaging time"];
  if (fp["acquisition range distance"] !== undefined)
    out["acquisition range distance"] = fp["acquisition range distance"];
  if (fp["trace type"] !== undefined)
    out["trace type"] = fp["trace type"];
  if (fp["X1"] !== undefined) { out["X1"] = fp["X1"]; out["Y1"] = fp["Y1"]; out["X2"] = fp["X2"]; out["Y2"] = fp["Y2"]; }
  return out;
}

function buildKeyEventsOutput(ke: KeyEventsRaw): Record<string, unknown> {
  const out: Record<string, unknown> = { "num events": ke["num events"] };
  for (const key of Object.keys(ke)) {
    if (key.startsWith("event ") || key === "Summary") {
      out[key] = ke[key];
    }
  }
  return out;
}

function buildDataPtsOutput(dp: DataPtsRaw): Record<string, unknown> {
  return {
    "_datapts_params": dp["_datapts_params"],
    "max before offset": dp["max before offset"],
    "min before offset": dp["min before offset"],
    "num data points": dp["num data points"],
    "num data points 2": dp["num data points 2"],
    "num traces": dp["num traces"],
    "scaling factor": dp["scaling factor"],
  };
}
