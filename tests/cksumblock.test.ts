/**
 * Tests for Cksum block parser.
 * Ports test_cksum.py assertions.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { BinaryReader } from "../src/reader.js";
import { parseMapBlock } from "../src/mapblock.js";
import { parseGenParams } from "../src/genparams.js";
import { parseSupParams } from "../src/supparams.js";
import { parseFxdParams } from "../src/fxdparams.js";
import { parseKeyEvents } from "../src/keyevents.js";
import { parseDataPts } from "../src/datapts.js";
import { parseCksum } from "../src/cksumblock.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixtures = join(__dirname, "fixtures");

/** Parse ALL blocks IN ORDER so CRC is accumulated correctly over every byte. */
function parseAll(filename: string) {
  const data = new Uint8Array(readFileSync(join(fixtures, filename)));
  const reader = new BinaryReader(data);
  const { format, blocks } = parseMapBlock(reader);

  // Process in map-declared order (same as pyOTDR's sorted(klist))
  const ordered = Object.values(blocks).sort((a, b) => a.order - b.order);

  let fp: ReturnType<typeof parseFxdParams> | undefined;
  let sp: ReturnType<typeof parseSupParams> | undefined;
  let cksum: ReturnType<typeof parseCksum> | undefined;

  for (const blk of ordered) {
    const name = blk.name;
    if (name === "GenParams") {
      parseGenParams(reader, blocks, format);
    } else if (name === "SupParams") {
      sp = parseSupParams(reader, blocks, format);
    } else if (name === "FxdParams") {
      fp = parseFxdParams(reader, blocks, format);
    } else if (name === "DataPts") {
      parseDataPts(reader, blocks, format, fp!, sp!);
    } else if (name === "KeyEvents") {
      parseKeyEvents(reader, blocks, format, fp!);
    } else if (name === "Cksum") {
      cksum = parseCksum(reader, blocks, format);
    } else {
      // Unknown/vendor block: read all bytes to keep CRC accurate
      reader.seek(blk.pos);
      reader.skip(blk.size);
    }
  }

  return cksum!;
}

describe("Cksum — demo_ab.sor (v1)", () => {
  const ck = parseAll("demo_ab.sor");

  it("stored checksum = 38827", () => expect(ck.checksum).toBe(38827));
  it("calculated checksum = 38827", () => expect(ck.checksum_ours).toBe(38827));
  it("match = true", () => expect(ck.match).toBe(true));
});

describe("Cksum — sample1310_lowDR.sor (v2)", () => {
  const ck = parseAll("sample1310_lowDR.sor");

  it("stored checksum = 59892", () => expect(ck.checksum).toBe(59892));
  it("calculated checksum = 62998", () => expect(ck.checksum_ours).toBe(62998));
  it("match = false (known mismatch in this file)", () => expect(ck.match).toBe(false));
});

describe("Cksum — M200_Sample_005_S13.sor (v1)", () => {
  const ck = parseAll("M200_Sample_005_S13.sor");

  it("stored checksum = 45751", () => expect(ck.checksum).toBe(45751));
  it("calculated checksum = 45751", () => expect(ck.checksum_ours).toBe(45751));
  it("match = true", () => expect(ck.match).toBe(true));
});
