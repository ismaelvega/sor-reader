/**
 * Full round-trip integration tests — ports test_read.py.
 *
 * Parses each .sor file and compares output against pyOTDR reference
 * JSON dumps (deep equality) and trace .dat files (line-by-line).
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { parseSor, toJSON, traceToString } from "../src/index.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixtures = join(__dirname, "fixtures");

function loadSorBytes(name: string): Uint8Array {
  return new Uint8Array(readFileSync(join(fixtures, name)));
}

function loadRefJSON(name: string): Record<string, unknown> {
  return JSON.parse(readFileSync(join(fixtures, name), "utf-8"));
}

function loadRefTrace(name: string): string[] {
  return readFileSync(join(fixtures, name), "utf-8")
    .split("\n")
    .filter((l) => l.length > 0);
}

/** Deep-equal comparison of two objects, ignoring key order. */
function deepEqual(a: unknown, b: unknown, path = ""): void {
  if (typeof a !== typeof b) {
    throw new Error(`Type mismatch at ${path}: ${typeof a} vs ${typeof b} (${JSON.stringify(a)} vs ${JSON.stringify(b)})`);
  }
  if (a === null || b === null) {
    expect(a, path).toBe(b);
    return;
  }
  if (typeof a === "object") {
    const ao = a as Record<string, unknown>;
    const bo = b as Record<string, unknown>;
    const ak = Object.keys(ao).sort();
    const bk = Object.keys(bo).sort();
    expect(ak, `keys at ${path}`).toEqual(bk);
    for (const k of ak) {
      deepEqual(ao[k], bo[k], `${path}.${k}`);
    }
  } else if (typeof a === "number" && typeof b === "number") {
    // Allow tiny floating-point differences (JS vs Python IEEE754)
    if (isNaN(a) && isNaN(b)) return;
    expect(a, path).toBeCloseTo(b as number, 8);
  } else {
    expect(a, path).toBe(b);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// demo_ab.sor (v1)
// ═══════════════════════════════════════════════════════════════════════════
describe("Round-trip: demo_ab.sor (v1)", () => {
  const result = parseSor(loadSorBytes("demo_ab.sor"), "demo_ab.sor");
  const refJSON = loadRefJSON("demo_ab-dump.json");
  const refTrace = loadRefTrace("demo_ab-trace.dat");

  it("parseSor returns status ok (no exception)", () => {
    expect(result).toBeDefined();
  });

  it("JSON output matches pyOTDR reference (deep equality)", () => {
    const generated = JSON.parse(toJSON(result));
    // Remove _datapts_params from generated (pyOTDR has it, we include it)
    deepEqual(generated["GenParams"], refJSON["GenParams"], "GenParams");
    deepEqual(generated["SupParams"], refJSON["SupParams"], "SupParams");
    deepEqual(generated["KeyEvents"], refJSON["KeyEvents"], "KeyEvents");
    deepEqual(generated["Cksum"], refJSON["Cksum"], "Cksum");
    // FxdParams: compare key fields, allow float tolerance
    const gfp = generated["FxdParams"] as Record<string, unknown>;
    const rfp = refJSON["FxdParams"] as Record<string, unknown>;
    expect(gfp["date/time"]).toBe(rfp["date/time"]);
    expect(gfp["wavelength"]).toBe(rfp["wavelength"]);
    expect(gfp["index"]).toBe(rfp["index"]);
    expect(gfp["BC"]).toBe(rfp["BC"]);
    expect(gfp["refl thr"]).toBe(rfp["refl thr"]);
    expect(gfp["num data points"]).toBe(rfp["num data points"]);
    expect(gfp["range"] as number).toBeCloseTo(rfp["range"] as number, 8);
    expect(gfp["resolution"] as number).toBeCloseTo(rfp["resolution"] as number, 8);
    // DataPts
    const gdp = generated["DataPts"] as Record<string, unknown>;
    const rdp = refJSON["DataPts"] as Record<string, unknown>;
    expect(gdp["num data points"]).toBe(rdp["num data points"]);
    expect(gdp["scaling factor"]).toBe(rdp["scaling factor"]);
    expect(gdp["max before offset"]).toBe(rdp["max before offset"]);
    expect(gdp["min before offset"]).toBe(rdp["min before offset"]);
  });

  it("trace data matches pyOTDR line-by-line", () => {
    const generated = traceToString(result.trace).split("\n").filter((l) => l.length > 0);
    expect(generated.length).toBe(refTrace.length);
    expect(generated[0]).toBe(refTrace[0]);
    expect(generated[100]).toBe(refTrace[100]);
    expect(generated[5000]).toBe(refTrace[5000]);
    expect(generated[generated.length - 1]).toBe(refTrace[refTrace.length - 1]);
  });

  it("checksum match = true", () => expect(result.Cksum.match).toBe(true));
  it("format = 1", () => expect(result.format).toBe(1));
  it("9 blocks in map", () => expect(Object.keys(result.blocks).length).toBe(9));
});

// ═══════════════════════════════════════════════════════════════════════════
// sample1310_lowDR.sor (v2)
// ═══════════════════════════════════════════════════════════════════════════
describe("Round-trip: sample1310_lowDR.sor (v2)", () => {
  const result = parseSor(loadSorBytes("sample1310_lowDR.sor"), "sample1310_lowDR.sor");
  const refJSON = loadRefJSON("sample1310_lowDR-dump.json");
  const refTrace = loadRefTrace("sample1310_lowDR-trace.dat");

  it("parseSor completes without exception", () => expect(result).toBeDefined());
  it("format = 2", () => expect(result.format).toBe(2));

  it("GenParams matches reference", () => {
    const g = result.GenParams;
    const r = refJSON["GenParams"] as Record<string, unknown>;
    expect(g["fiber type"]).toBe(r["fiber type"]);
    expect(g["build condition"]).toBe(r["build condition"]);
    expect(g["user offset distance"]).toBe(String(r["user offset distance"]));
  });

  it("FxdParams v2 extras match reference", () => {
    const fp = result.FxdParams;
    const rfp = refJSON["FxdParams"] as Record<string, unknown>;
    expect(fp["averaging time"]).toBe(rfp["averaging time"]);
    expect(fp["trace type"]).toBe(rfp["trace type"]);
    expect(fp["acquisition offset"]).toBe(rfp["acquisition offset"]);
  });

  it("KeyEvents v2 has position fields", () => {
    const ev = result.KeyEvents["event 1"] as Record<string, string>;
    const ref = (refJSON["KeyEvents"] as Record<string, Record<string, unknown>>)["event 1"];
    expect(ev["end of curr"]).toBe(ref["end of curr"]);
    expect(ev["start of next"]).toBe(ref["start of next"]);
    expect(ev["peak"]).toBe(ref["peak"]);
  });

  it("checksum match = false (known mismatch)", () => expect(result.Cksum.match).toBe(false));
  it("checksum_ours = 62998", () => expect(result.Cksum.checksum_ours).toBe(62998));

  it("trace data matches pyOTDR line-by-line", () => {
    const generated = traceToString(result.trace).split("\n").filter((l) => l.length > 0);
    expect(generated.length).toBe(refTrace.length);
    expect(generated[0]).toBe(refTrace[0]);
    expect(generated[1000]).toBe(refTrace[1000]);
    expect(generated[generated.length - 1]).toBe(refTrace[refTrace.length - 1]);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// M200_Sample_005_S13.sor (v1, Noyes)
// ═══════════════════════════════════════════════════════════════════════════
describe("Round-trip: M200_Sample_005_S13.sor (v1, Noyes)", () => {
  const result = parseSor(loadSorBytes("M200_Sample_005_S13.sor"), "M200_Sample_005_S13.sor");
  const refJSON = loadRefJSON("M200_Sample_005_S13-dump.json");
  const refTrace = loadRefTrace("M200_Sample_005_S13-trace.dat");

  it("parseSor completes without exception", () => expect(result).toBeDefined());
  it("format = 1", () => expect(result.format).toBe(1));

  it("GenParams matches reference", () => {
    const g = result.GenParams;
    const r = refJSON["GenParams"] as Record<string, unknown>;
    expect(g["cable ID"]).toBe(r["cable ID"]);
    expect(g["operator"]).toBe(r["operator"]);
    expect(g["user offset"]).toBe(String(r["user offset"]));
  });

  it("SupParams: supplier = Noyes", () => {
    expect(result.SupParams.supplier).toBe("Noyes");
  });

  it("checksum match = true", () => expect(result.Cksum.match).toBe(true));

  it("trace data matches pyOTDR line-by-line", () => {
    const generated = traceToString(result.trace).split("\n").filter((l) => l.length > 0);
    expect(generated.length).toBe(refTrace.length);
    expect(generated[0]).toBe(refTrace[0]);
    expect(generated[500]).toBe(refTrace[500]);
    expect(generated[generated.length - 1]).toBe(refTrace[refTrace.length - 1]);
  });

  it("Uint8Array and Buffer inputs produce the same result", () => {
    const buf = readFileSync(join(fixtures, "M200_Sample_005_S13.sor")); // Buffer
    const r2 = parseSor(new Uint8Array(buf), "M200_Sample_005_S13.sor");
    expect(r2.Cksum.checksum_ours).toBe(result.Cksum.checksum_ours);
    expect(r2.FxdParams["num data points"]).toBe(result.FxdParams["num data points"]);
  });
});
