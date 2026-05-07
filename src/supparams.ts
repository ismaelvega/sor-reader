/**
 * SupParams block parser — mirrors supparams.py.
 *
 * Contains supplier/equipment identification: OTDR vendor, model, serial numbers,
 * module info, software version, and other free-text.
 *
 * Format is identical for v1 and v2 (7 null-terminated strings).
 */

import { BinaryReader } from "./reader.js";
import { BlockInfo, SupParamsRaw } from "./types.js";
import { InvalidBlockError, MissingBlockError } from "./errors.js";

const BLOCK_NAME = "SupParams";

export function parseSupParams(
  reader: BinaryReader,
  blocks: Record<string, BlockInfo>,
  format: 1 | 2,
): SupParamsRaw {
  const blockInfo = blocks[BLOCK_NAME];
  if (!blockInfo) throw new MissingBlockError(BLOCK_NAME);

  reader.seek(blockInfo.pos);

  if (format === 2) {
    const header = reader.getString();
    if (header !== BLOCK_NAME) throw new InvalidBlockError(BLOCK_NAME, header);
  }

  return {
    supplier: reader.getString(),
    OTDR: reader.getString(),
    "OTDR S/N": reader.getString(),
    module: reader.getString(),
    "module S/N": reader.getString(),
    software: reader.getString(),
    other: reader.getString(),
  };
}
