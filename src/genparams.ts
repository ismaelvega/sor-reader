/**
 * GenParams block parser — mirrors genparams.py.
 *
 * Contains identification metadata: cable/fiber IDs, wavelength, locations,
 * build condition, operator, and comments.
 *
 * v1: 10 fields  (language + 9 data fields)
 * v2: 12 fields  (adds fiber type at position 2, user offset distance at position 9)
 */

import { BinaryReader } from "./reader.js";
import { BlockInfo } from "./types.js";
import { decodeBuildCondition, decodeFiberType } from "./constants.js";
import { InvalidBlockError, MissingBlockError } from "./errors.js";

const BLOCK_NAME = "GenParams";

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

export function parseGenParams(
  reader: BinaryReader,
  blocks: Record<string, BlockInfo>,
  format: 1 | 2,
): GenParamsRaw {
  const blockInfo = blocks[BLOCK_NAME];
  if (!blockInfo) throw new MissingBlockError(BLOCK_NAME);

  reader.seek(blockInfo.pos);

  // v2 blocks start with their name as a null-terminated string header
  if (format === 2) {
    const header = reader.getString();
    if (header !== BLOCK_NAME) throw new InvalidBlockError(BLOCK_NAME, header);
  }

  const result: GenParamsRaw = {
    language: reader.getRawString(2),
    "cable ID": "",
    "fiber ID": "",
    wavelength: "",
    "location A": "",
    "location B": "",
    "cable code/fiber type": "",
    "build condition": "",
    "user offset": "",
    operator: "",
    comments: "",
  };

  result["cable ID"] = reader.getString();
  result["fiber ID"] = reader.getString();

  // v2 adds fiber type (uint16) before wavelength
  if (format === 2) {
    const fiberTypeVal = reader.getUint(2);
    result["fiber type"] = decodeFiberType(fiberTypeVal);
  }

  const wavelengthRaw = reader.getUint(2);
  result["wavelength"] = `${wavelengthRaw} nm`;

  result["location A"] = reader.getString();
  result["location B"] = reader.getString();
  result["cable code/fiber type"] = reader.getString();

  // build condition: 2-byte char string
  const bcCode = reader.getRawString(2);
  result["build condition"] = decodeBuildCondition(bcCode);

  // user offset: signed int32
  const userOffset = reader.getSigned(4);
  result["user offset"] = String(userOffset);

  // v2 adds user offset distance (signed int32) before operator
  if (format === 2) {
    const userOffsetDist = reader.getSigned(4);
    result["user offset distance"] = String(userOffsetDist);
  }

  result["operator"] = reader.getString();
  result["comments"] = reader.getString();

  return result;
}
