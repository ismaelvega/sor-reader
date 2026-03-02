/**
 * Cksum block parser — mirrors cksum.py.
 *
 * Finalises the running CRC16-CCITT from the BinaryReader and compares it
 * against the 2-byte checksum stored at the end of the SOR file.
 *
 * NOTE: does NOT throw on mismatch — some real-world SOR files have wrong
 * checksums (e.g. sample1310_lowDR.sor).
 *
 * v1: 2 bytes (checksum only, no block name header)
 * v2: "Cksum\0" header (6 bytes) + 2 bytes checksum = 8 bytes total
 */

import { BinaryReader } from "./reader.js";
import { BlockInfo } from "./types.js";
import { InvalidBlockError, MissingBlockError } from "./errors.js";

const BLOCK_NAME = "Cksum";

export interface CksumRaw {
  checksum: number;
  checksum_ours: number;
  match: boolean;
}

export function parseCksum(
  reader: BinaryReader,
  blocks: Record<string, BlockInfo>,
  format: 1 | 2,
): CksumRaw {
  const blockInfo = blocks[BLOCK_NAME];
  if (!blockInfo) throw new MissingBlockError(BLOCK_NAME);

  reader.seek(blockInfo.pos);

  if (format === 2) {
    const header = reader.getString();
    if (header !== BLOCK_NAME) throw new InvalidBlockError(BLOCK_NAME, header);
  }

  // Finalise the CRC from all bytes read so far (before reading the stored value)
  const calculated = reader.digest();

  // Read the stored 2-byte checksum (this also feeds it into the CRC,
  // but digest() was already called so the accumulated value is captured)
  const stored = reader.getUint(2);

  return {
    checksum: stored,
    checksum_ours: calculated,
    match: calculated === stored,
  };
}
