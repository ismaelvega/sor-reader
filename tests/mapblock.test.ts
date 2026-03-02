/**
 * Tests for mapblock.ts — ports test_map.py assertions.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { BinaryReader } from "../src/reader.js";
import { parseMapBlock } from "../src/mapblock.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixtures = join(__dirname, "fixtures");

function readerFor(filename: string): BinaryReader {
  return new BinaryReader(new Uint8Array(readFileSync(join(fixtures, filename))));
}

// ── demo_ab.sor (Bellcore v1) ─────────────────────────────────────────────────
describe("parseMapBlock — demo_ab.sor (v1)", () => {
  const result = parseMapBlock(readerFor("demo_ab.sor"));

  it("detects format 1", () => expect(result.format).toBe(1));
  it("reads version 1.00", () => expect(result.version).toBe("1.00"));
  it("reads map block size 148 bytes", () => expect(result.mapBlock.nbytes).toBe(148));
  it("reads 9 data blocks", () => expect(result.mapBlock.nblocks).toBe(9));

  it("Cksum block: pos=25706, version=1.00", () => {
    expect(result.blocks["Cksum"]?.pos).toBe(25706);
    expect(result.blocks["Cksum"]?.version).toBe("1.00");
  });

  it("DataPts block: pos=328, size=23564, version=1.01", () => {
    expect(result.blocks["DataPts"]?.pos).toBe(328);
    expect(result.blocks["DataPts"]?.size).toBe(23564);
    expect(result.blocks["DataPts"]?.version).toBe("1.01");
  });

  it("GenParams block: pos=148, size=44, order=0", () => {
    expect(result.blocks["GenParams"]?.pos).toBe(148);
    expect(result.blocks["GenParams"]?.size).toBe(44);
    expect(result.blocks["GenParams"]?.order).toBe(0);
  });

  it("all expected blocks present", () => {
    const names = Object.keys(result.blocks);
    for (const name of ["GenParams", "SupParams", "FxdParams", "DataPts", "KeyEvents", "Cksum"]) {
      expect(names).toContain(name);
    }
  });
});

// ── sample1310_lowDR.sor (Bellcore v2) ───────────────────────────────────────
describe("parseMapBlock — sample1310_lowDR.sor (v2)", () => {
  const result = parseMapBlock(readerFor("sample1310_lowDR.sor"));

  it("detects format 2", () => expect(result.format).toBe(2));
  it("reads version 2.00", () => expect(result.version).toBe("2.00"));
  it("reads map block size 148 bytes", () => expect(result.mapBlock.nbytes).toBe(148));
  it("reads 9 data blocks", () => expect(result.mapBlock.nblocks).toBe(9));

  it("Cksum block: pos=32125, size=8, version=2.00", () => {
    expect(result.blocks["Cksum"]?.pos).toBe(32125);
    expect(result.blocks["Cksum"]?.size).toBe(8);
    expect(result.blocks["Cksum"]?.version).toBe("2.00");
  });

  it("DataPts block: pos=520, size=31492", () => {
    expect(result.blocks["DataPts"]?.pos).toBe(520);
    expect(result.blocks["DataPts"]?.size).toBe(31492);
  });

  it("FxdParams block: pos=265, size=92", () => {
    expect(result.blocks["FxdParams"]?.pos).toBe(265);
    expect(result.blocks["FxdParams"]?.size).toBe(92);
  });

  it("blocks ordered correctly by order field", () => {
    const ordered = Object.values(result.blocks).sort((a, b) => a.order - b.order);
    expect(ordered[0]?.name).toBe("GenParams");
    expect(ordered[ordered.length - 1]?.name).toBe("Cksum");
  });
});
