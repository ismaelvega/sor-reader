/**
 * Tests for BinaryReader — ports test_parts.py assertions exactly.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { BinaryReader } from "../src/reader.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixtures = join(__dirname, "fixtures");

function readerFor(filename: string): BinaryReader {
  const data = new Uint8Array(readFileSync(join(fixtures, filename)));
  return new BinaryReader(data);
}

// ── getString ────────────────────────────────────────────────────────────────
describe("BinaryReader.getString()", () => {
  it("reads 'Map' null-terminated string from sample1310_lowDR.sor at offset 0", () => {
    const r = readerFor("sample1310_lowDR.sor");
    expect(r.getString()).toBe("Map");
    expect(r.tell()).toBe(4); // "Map" = 3 bytes + null terminator
  });
});

// ── getUint ──────────────────────────────────────────────────────────────────
describe("BinaryReader.getUint()", () => {
  it("reads uint16=100 at offset 0 of demo_ab.sor (version=1.00)", () => {
    const r = readerFor("demo_ab.sor");
    expect(r.getUint(2)).toBe(100);
    expect(r.tell()).toBe(2);
  });

  it("reads uint32=148 at offset 2 of demo_ab.sor (map block size)", () => {
    const r = readerFor("demo_ab.sor");
    r.getUint(2); // skip version
    expect(r.getUint(4)).toBe(148);
    expect(r.tell()).toBe(6);
  });
});

// ── getHex ───────────────────────────────────────────────────────────────────
describe("BinaryReader.getHex()", () => {
  it("reads first 8 bytes of demo_ab.sor as hex", () => {
    const r = readerFor("demo_ab.sor");
    expect(r.getHex(8)).toBe("64 00 94 00 00 00 0A 00 ");
  });
});

// ── getSigned ────────────────────────────────────────────────────────────────
describe("BinaryReader.getSigned()", () => {
  it("reads signed values at offset 461 of sample1310_lowDR.sor", () => {
    const r = readerFor("sample1310_lowDR.sor");
    r.seek(461);
    // These values come directly from test_parts.py assertions
    expect(r.getSigned(2)).toBe(343);
    expect(r.getSigned(2)).toBe(22820);
    expect(r.getSigned(4)).toBe(-38395);
    expect(r.getSigned(8)).toBe(6002235321314002225);
  });
});

// ── getRawString ─────────────────────────────────────────────────────────────
describe("BinaryReader.getRawString()", () => {
  it("reads fixed-width 2-byte string", () => {
    // demo_ab.sor: after version (2B) + map size (4B) + block count (2B) = offset 8
    // then "GenParams\0" starts the block entries. We just test the primitive.
    const r = new BinaryReader(new Uint8Array([0x45, 0x4e, 0x00])); // "EN\0"
    expect(r.getRawString(2)).toBe("EN");
  });
});

// ── seek and CRC reset ────────────────────────────────────────────────────────
describe("BinaryReader.seek(0)", () => {
  it("resets offset to 0 and resets CRC accumulator", () => {
    const r = readerFor("demo_ab.sor");
    r.getUint(2); // read 2 bytes
    expect(r.tell()).toBe(2);

    r.seek(0);
    expect(r.tell()).toBe(0);

    // After reset, reading 2 bytes again should give the same CRC as reading fresh
    const r2 = readerFor("demo_ab.sor");
    r.getUint(2);
    r2.getUint(2);
    expect(r.digest()).toBe(r2.digest());
  });
});

// ── CRC accumulation ─────────────────────────────────────────────────────────
describe("BinaryReader CRC accumulation", () => {
  it("computes correct CRC for demo_ab.sor (checksum 38827)", () => {
    const data = new Uint8Array(readFileSync(join(fixtures, "demo_ab.sor")));
    // Read all bytes except the last 2 (which are the stored checksum)
    const r = new BinaryReader(data.slice(0, data.length - 2));
    r.skip(data.length - 2);
    expect(r.digest()).toBe(38827);
  });

  it("computes correct CRC for sample1310_lowDR.sor (our calculated: 62998)", () => {
    const data = new Uint8Array(readFileSync(join(fixtures, "sample1310_lowDR.sor")));
    // v2: Cksum block has 6-byte header "Cksum\0" + 2-byte checksum at end
    // The stored checksum is the last 2 bytes, so we read everything except last 2
    const r = new BinaryReader(data.slice(0, data.length - 2));
    r.skip(data.length - 2);
    expect(r.digest()).toBe(62998);
  });
});
