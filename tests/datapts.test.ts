/**
 * Tests for DataPts parser and trace data output.
 * Compares line-by-line against pyOTDR reference .dat files.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { BinaryReader } from "../src/reader.js";
import { parseMapBlock } from "../src/mapblock.js";
import { parseFxdParams } from "../src/fxdparams.js";
import { parseSupParams } from "../src/supparams.js";
import { parseDataPts, traceToString } from "../src/datapts.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixtures = join(__dirname, "fixtures");

function loadAll(filename: string) {
  const data = new Uint8Array(readFileSync(join(fixtures, filename)));
  const reader = new BinaryReader(data);
  const { format, blocks } = parseMapBlock(reader);
  const fp = parseFxdParams(reader, blocks, format);
  const sp = parseSupParams(reader, blocks, format);
  const dp = parseDataPts(reader, blocks, format, fp, sp);
  return { fp, sp, dp };
}

function loadRefTrace(filename: string): string[] {
  return readFileSync(join(fixtures, filename), "utf-8").split("\n").filter((l) => l.length > 0);
}

// ── demo_ab.sor ───────────────────────────────────────────────────────────────
describe("demo_ab.sor — DataPts", () => {
  const { dp } = loadAll("demo_ab.sor");

  it("num data points = 11776", () => expect(dp.info["num data points"]).toBe(11776));
  it("num data points 2 = 11776", () => expect(dp.info["num data points 2"]).toBe(11776));
  it("num traces = 1", () => expect(dp.info["num traces"]).toBe(1));
  it("scaling factor = 1.0", () => expect(dp.info["scaling factor"]).toBe(1.0));
  it("max before offset = 65.535", () => expect(dp.info["max before offset"]).toBe(65.535));
  it("min before offset = 15.829", () => expect(dp.info["min before offset"]).toBe(15.829));
  it("xscaling = 1", () => expect(dp.info["_datapts_params"].xscaling).toBe(1));
  it("offset method = STV", () => expect(dp.info["_datapts_params"].offset).toBe("STV"));
  it("trace has 11776 points", () => expect(dp.trace.length).toBe(11776));

  it("first trace point distance = 0.000000 km", () =>
    expect(dp.trace[0]!.distance).toBeCloseTo(0.0, 10));

  it("trace data matches pyOTDR reference line-by-line", () => {
    const refLines = loadRefTrace("demo_ab-trace.dat");
    const generated = traceToString(dp.trace).split("\n").filter((l) => l.length > 0);
    expect(generated.length).toBe(refLines.length);
    // Check first, last, and a sample in the middle
    expect(generated[0]).toBe(refLines[0]);
    expect(generated[100]).toBe(refLines[100]);
    expect(generated[5000]).toBe(refLines[5000]);
    expect(generated[generated.length - 1]).toBe(refLines[refLines.length - 1]);
  });
});

// ── sample1310_lowDR.sor ──────────────────────────────────────────────────────
describe("sample1310_lowDR.sor — DataPts", () => {
  const { dp } = loadAll("sample1310_lowDR.sor");

  it("num data points = 15736", () => expect(dp.info["num data points"]).toBe(15736));
  it("scaling factor = 1.0", () => expect(dp.info["scaling factor"]).toBe(1.0));
  it("max before offset = 63.611", () => expect(dp.info["max before offset"]).toBe(63.611));
  it("min before offset = 6.566", () => expect(dp.info["min before offset"]).toBe(6.566));

  it("trace data matches pyOTDR reference line-by-line", () => {
    const refLines = loadRefTrace("sample1310_lowDR-trace.dat");
    const generated = traceToString(dp.trace).split("\n").filter((l) => l.length > 0);
    expect(generated.length).toBe(refLines.length);
    expect(generated[0]).toBe(refLines[0]);
    expect(generated[100]).toBe(refLines[100]);
    expect(generated[generated.length - 1]).toBe(refLines[refLines.length - 1]);
  });
});

// ── M200_Sample_005_S13.sor ───────────────────────────────────────────────────
describe("M200_Sample_005_S13.sor — DataPts", () => {
  const { dp } = loadAll("M200_Sample_005_S13.sor");

  it("num data points = 16000", () => expect(dp.info["num data points"]).toBe(16000));
  it("max before offset = 65.535", () => expect(dp.info["max before offset"]).toBe(65.535));
  it("min before offset = 0.535", () => expect(dp.info["min before offset"]).toBe(0.535));

  it("trace data matches pyOTDR reference line-by-line", () => {
    const refLines = loadRefTrace("M200_Sample_005_S13-trace.dat");
    const generated = traceToString(dp.trace).split("\n").filter((l) => l.length > 0);
    expect(generated.length).toBe(refLines.length);
    expect(generated[0]).toBe(refLines[0]);
    expect(generated[500]).toBe(refLines[500]);
    expect(generated[generated.length - 1]).toBe(refLines[refLines.length - 1]);
  });
});
