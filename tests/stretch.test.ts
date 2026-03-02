/**
 * M12 stretch-goal tests:
 *   1. Multiple pulse widths — no longer throws
 *   2. Vendor block registry — custom parsers invoked
 *   3. Unknown vendor blocks captured as raw VendorBlock
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { parseSor, VendorBlock } from "../src/index.js";
import type { VendorBlockParser } from "../src/index.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixtures = join(__dirname, "fixtures");

function loadSor(name: string): Uint8Array {
  return new Uint8Array(readFileSync(join(fixtures, name)));
}

// ── Vendor block capture ──────────────────────────────────────────────────────
describe("Vendor block capture — demo_ab.sor", () => {
  // demo_ab.sor (v1) contains HPEvent, Threshold, HPSpecialInfo vendor blocks
  const result = parseSor(loadSor("demo_ab.sor"), "demo_ab.sor");

  it("vendorBlocks is an object", () => {
    expect(typeof result.vendorBlocks).toBe("object");
  });

  it("at least one vendor block is captured", () => {
    expect(Object.keys(result.vendorBlocks).length).toBeGreaterThan(0);
  });

  it("each vendor block has name, version, and bytes", () => {
    for (const val of Object.values(result.vendorBlocks)) {
      const vb = val as VendorBlock;
      expect(typeof vb.name).toBe("string");
      expect(typeof vb.version).toBe("string");
      expect(vb.bytes).toBeInstanceOf(Uint8Array);
      expect(vb.bytes.length).toBeGreaterThan(0);
    }
  });

  it("checksum still matches after vendor block reads", () => {
    // Critical: reading vendor bytes must still feed the CRC correctly
    expect(result.Cksum.match).toBe(true);
  });
});

// ── Vendor parser registry ────────────────────────────────────────────────────
describe("Vendor parser registry", () => {
  it("invokes custom parser for matching block name", () => {
    const calls: string[] = [];

    // Find what vendor block names demo_ab.sor has
    const probe = parseSor(loadSor("demo_ab.sor"), "demo_ab.sor");
    const vendorNames = Object.keys(probe.vendorBlocks);
    expect(vendorNames.length).toBeGreaterThan(0);

    const targetBlock = vendorNames[0]!;

    const customParser: VendorBlockParser = (block, format) => {
      calls.push(block.name);
      return { parsed: true, format, byteCount: block.bytes.length };
    };

    const result = parseSor(loadSor("demo_ab.sor"), "demo_ab.sor", {
      vendorParsers: { [targetBlock]: customParser },
    });

    expect(calls).toContain(targetBlock);
    const parsed = result.vendorBlocks[targetBlock] as Record<string, unknown>;
    expect(parsed["parsed"]).toBe(true);
    expect(parsed["byteCount"]).toBeGreaterThan(0);
  });

  it("does not call parser for non-matching block names", () => {
    const calls: string[] = [];
    const neverCalled: VendorBlockParser = (block) => {
      calls.push(block.name);
      return null;
    };

    parseSor(loadSor("demo_ab.sor"), "demo_ab.sor", {
      vendorParsers: { NonExistentBlock: neverCalled },
    });

    expect(calls.length).toBe(0);
  });

  it("checksum still correct when custom parser is used", () => {
    const probe = parseSor(loadSor("demo_ab.sor"), "demo_ab.sor");
    const targetBlock = Object.keys(probe.vendorBlocks)[0]!;

    const result = parseSor(loadSor("demo_ab.sor"), "demo_ab.sor", {
      vendorParsers: {
        [targetBlock]: (block) => ({ raw: block.bytes }),
      },
    });
    expect(result.Cksum.match).toBe(true);
  });
});

// ── Multiple pulse widths ─────────────────────────────────────────────────────
describe("Multiple pulse widths — simulated", () => {
  // All 3 fixture files have numPwEntries = 1, so we test that parsing
  // succeeds (no throw) and returns the correct pulse width.
  it("demo_ab.sor (numPwEntries=1) parses without error", () => {
    const result = parseSor(loadSor("demo_ab.sor"), "demo_ab.sor");
    expect(result.FxdParams["number of pulse width entries"]).toBe(1);
    expect(result.FxdParams["pulse width"]).toMatch(/^\d+ ns$/);
  });

  it("sample1310_lowDR.sor (numPwEntries=1) parses without error", () => {
    const result = parseSor(loadSor("sample1310_lowDR.sor"), "sample1310_lowDR.sor");
    expect(result.FxdParams["number of pulse width entries"]).toBe(1);
    expect(result.FxdParams["pulse width"]).toMatch(/^\d+ ns$/);
  });

  it("M200_Sample_005_S13.sor (numPwEntries=1) parses without error", () => {
    const result = parseSor(loadSor("M200_Sample_005_S13.sor"), "M200_Sample_005_S13.sor");
    expect(result.FxdParams["number of pulse width entries"]).toBe(1);
    expect(result.FxdParams["pulse width"]).toMatch(/^\d+ ns$/);
  });
});
