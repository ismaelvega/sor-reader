/**
 * Map block parser — mirrors mapblock.py.
 *
 * The map block is always at the start of the SOR file. It acts as a table
 * of contents, listing every other block's name, version, and byte size.
 * The block start positions are computed by accumulating the sizes.
 *
 * Version detection:
 *   - Bellcore 2.x: file starts with null-terminated string "Map"
 *   - Bellcore 1.x: no such header; rewind to position 0 after detection
 */

import { BinaryReader } from "./reader.js";
import { BlockInfo, MapBlockInfo } from "./types.js";

export interface MapBlockResult {
  format: 1 | 2;
  version: string;
  mapBlock: MapBlockInfo;
  blocks: Record<string, BlockInfo>;
}

export function parseMapBlock(reader: BinaryReader): MapBlockResult {
  reader.seek(0);

  // ── Version detection ────────────────────────────────────────────────────
  const firstStr = reader.getString();
  let format: 1 | 2;

  if (firstStr === "Map") {
    format = 2;
  } else {
    format = 1;
    // Rewind — v1 has no "Map\0" header; the version uint16 is at byte 0
    reader.seek(0);
  }

  // ── Version number ───────────────────────────────────────────────────────
  // Stored as uint16 × 0.01: e.g. 100 → "1.00", 200 → "2.00"
  const versionRaw = reader.getUint(2);
  const version = (versionRaw * 0.01).toFixed(2);

  // ── Map block size ────────────────────────────────────────────────────────
  const mapBlockBytes = reader.getUint(4);

  // ── Block count ───────────────────────────────────────────────────────────
  // The stored count includes the Map block itself; subtract 1 for data blocks
  const totalBlockCount = reader.getUint(2);
  const nblocks = totalBlockCount - 1;

  // ── Block directory entries ───────────────────────────────────────────────
  const blocks: Record<string, BlockInfo> = {};
  // First data block starts immediately after the map block
  let startpos = mapBlockBytes;

  for (let i = 0; i < nblocks; i++) {
    const bname = reader.getString();
    const bverRaw = reader.getUint(2);
    const bver = (bverRaw * 0.01).toFixed(2);
    const bsize = reader.getUint(4);

    blocks[bname] = {
      name: bname,
      version: bver,
      size: bsize,
      pos: startpos,
      order: i,
    };

    startpos += bsize;
  }

  return {
    format,
    version,
    mapBlock: { nbytes: mapBlockBytes, nblocks },
    blocks,
  };
}
