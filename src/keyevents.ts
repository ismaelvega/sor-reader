/**
 * KeyEvents block parser — mirrors keyevents.py.
 *
 * Parses detected fiber events (connectors, splices, bends, end-of-fiber)
 * and a summary section with total loss and ORL.
 *
 * Event type decoding: 8-char ASCII string matching regex /(.)(.)9999LS/
 *   char 1: 0=loss/drop/gain, 1=reflection, 2=multiple
 *   char 2: A=manual, other=auto
 *   last char: S=standard, E=end-of-fiber
 *
 * v1: 22 bytes per event header + null-terminated comments
 * v2: 42 bytes per event header (+5×4-byte position fields) + comments
 */

import { BinaryReader } from "./reader.js";
import { BlockInfo, FxdParamsRaw, KeyEventRaw, KeyEventsRaw } from "./types.js";
import { SOL } from "./constants.js";
import { InvalidBlockError, MissingBlockError } from "./errors.js";

const BLOCK_NAME = "KeyEvents";

/**
 * Decode the 8-char event type string.
 * Pattern: (.)(.)9999LS where the last char may also be E (end of fiber).
 * Matches pyOTDR's keyevents.py regex decoding exactly.
 */
function decodeEventType(raw: string): string {
  const match = raw.match(/^(.)(.)9999L(S|E)/);
  if (!match) {
    return raw + " [unknown type " + raw + "]";
  }

  const subtype = match[1]!;
  const method = match[2]!;

  let result = raw;

  if (method === "A") {
    result += " {manual}";
  } else {
    result += " {auto}";
  }

  if (subtype === "1") {
    result += " reflection";
  } else if (subtype === "0") {
    result += " loss/drop/gain";
  } else if (subtype === "2") {
    result += " multiple";
  } else {
    result += " unknown '" + subtype + "'";
  }

  return result;
}

export function parseKeyEvents(
  reader: BinaryReader,
  blocks: Record<string, BlockInfo>,
  format: 1 | 2,
  fxdParams: FxdParamsRaw,
): KeyEventsRaw {
  const blockInfo = blocks[BLOCK_NAME];
  if (!blockInfo) throw new MissingBlockError(BLOCK_NAME);

  reader.seek(blockInfo.pos);

  if (format === 2) {
    const header = reader.getString();
    if (header !== BLOCK_NAME) throw new InvalidBlockError(BLOCK_NAME, header);
  }

  // distance conversion factor: raw uint32 × 1e-4 usec → km
  const ior = parseFloat(fxdParams["index"]);
  const factor = 1e-4 * SOL / ior;

  const numEvents = reader.getUint(2);

  const result: KeyEventsRaw = {
    "num events": numEvents,
    Summary: {
      "total loss": 0,
      ORL: 0,
      "loss start": 0,
      "loss end": 0,
      "ORL start": 0,
      "ORL finish": 0,
    },
  };

  for (let j = 0; j < numEvents; j++) {
    reader.getUint(2); // event number (not stored in output)
    const distRaw = reader.getUint(4);
    const dist = distRaw * factor;

    const slope = reader.getSigned(2) * 0.001;
    const spliceLoss = reader.getSigned(2) * 0.001;
    const reflLoss = reader.getSigned(4) * 0.001;

    // 8-byte ASCII event type string (no null terminator)
    const typeBuf = reader.read(8);
    const typeStr = new TextDecoder("ascii").decode(typeBuf);
    const eventType = decodeEventType(typeStr);

    const ev: KeyEventRaw = {
      type: eventType,
      distance: dist.toFixed(3),
      slope: slope.toFixed(3),
      "splice loss": spliceLoss.toFixed(3),
      "refl loss": reflLoss.toFixed(3),
      comments: "",
    };

    // v2 adds 5 × uint32 position fields
    if (format === 2) {
      ev["end of prev"] = (reader.getUint(4) * factor).toFixed(3);
      ev["start of curr"] = (reader.getUint(4) * factor).toFixed(3);
      ev["end of curr"] = (reader.getUint(4) * factor).toFixed(3);
      ev["start of next"] = (reader.getUint(4) * factor).toFixed(3);
      ev["peak"] = (reader.getUint(4) * factor).toFixed(3);
    }

    ev.comments = reader.getString();

    result[`event ${j + 1}`] = ev;
  }

  // ── Summary section ─────────────────────────────────────────────────────
  const totalLoss = reader.getSigned(4) * 0.001;
  const lossStart = reader.getSigned(4) * factor;
  const lossEnd = reader.getUint(4) * factor;
  const orl = reader.getUint(2) * 0.001;
  const orlStart = reader.getSigned(4) * factor;
  const orlFinish = reader.getUint(4) * factor;

  result["Summary"] = {
    "total loss": parseFloat(totalLoss.toFixed(3)),
    ORL: parseFloat(orl.toFixed(3)),
    "loss start": parseFloat(lossStart.toFixed(6)),
    "loss end": parseFloat(lossEnd.toFixed(6)),
    "ORL start": parseFloat(orlStart.toFixed(6)),
    "ORL finish": parseFloat(orlFinish.toFixed(6)),
  };

  // ── Consume remaining bytes in block ────────────────────────────────────
  const consumed = reader.tell() - blockInfo.pos;
  const remaining = blockInfo.size - consumed;
  if (remaining > 0) reader.skip(remaining);

  return result;
}
