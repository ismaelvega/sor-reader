/**
 * Tests for GenParams, SupParams, FxdParams parsers.
 * All expected values come from the pyOTDR reference JSON dumps.
 */
import { describe, it, expect, beforeAll } from "vitest";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { BinaryReader } from "../src/reader.js";
import { parseMapBlock } from "../src/mapblock.js";
import { parseGenParams } from "../src/genparams.js";
import { parseSupParams } from "../src/supparams.js";
import { parseFxdParams } from "../src/fxdparams.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixtures = join(__dirname, "fixtures");

function loadSor(filename: string) {
  const data = new Uint8Array(readFileSync(join(fixtures, filename)));
  const reader = new BinaryReader(data);
  const { format, version, mapBlock, blocks } = parseMapBlock(reader);
  return { reader, format, version, mapBlock, blocks };
}

// ═══════════════════════════════════════════════════════════════════════════
// demo_ab.sor (v1)
// ═══════════════════════════════════════════════════════════════════════════
describe("demo_ab.sor (v1) — GenParams", () => {
  const { reader, format, blocks } = loadSor("demo_ab.sor");
  const gp = parseGenParams(reader, blocks, format);

  it("language = EN", () => expect(gp.language).toBe("EN"));
  it("cable ID = K1 AB", () => expect(gp["cable ID"]).toBe("K1 AB"));
  it("fiber ID", () => expect(gp["fiber ID"]).toBe(" "));
  it("wavelength = 1310 nm", () => expect(gp.wavelength).toBe("1310 nm"));
  it("location A", () => expect(gp["location A"]).toBe(" "));
  it("location B", () => expect(gp["location B"]).toBe(" "));
  it("build condition = CC (as-current)", () => expect(gp["build condition"]).toBe("CC (as-current)"));
  it("user offset = 0", () => expect(gp["user offset"]).toBe("0"));
  it("operator", () => expect(gp["operator"]).toBe("HP "));
  it("comments", () => expect(gp["comments"]).toBe("HP Emulation SW"));
  it("no fiber type field in v1", () => expect(gp["fiber type"]).toBeUndefined());
});

describe("demo_ab.sor (v1) — SupParams", () => {
  const { reader, format, blocks } = loadSor("demo_ab.sor");
  const sp = parseSupParams(reader, blocks, format);

  it("supplier = Hewlett Packard", () => expect(sp.supplier).toBe("Hewlett Packard"));
  it("OTDR = E6000A", () => expect(sp.OTDR).toBe("E6000A "));
  it("OTDR S/N", () => expect(sp["OTDR S/N"]).toBe("3617G00108 "));
  it("module = E6008A", () => expect(sp.module).toBe("E6008A "));
  it("module S/N", () => expect(sp["module S/N"]).toBe("DE37300051 "));
  it("software = 3.0", () => expect(sp.software).toBe("3.0"));
});

describe("demo_ab.sor (v1) — FxdParams", () => {
  const { reader, format, blocks } = loadSor("demo_ab.sor");
  const fp = parseFxdParams(reader, blocks, format);

  it("date/time matches", () =>
    expect(fp["date/time"]).toBe("Thu Feb 05 08:46:14 1998 (886668374 sec)"));
  it("unit = mt (meters)", () => expect(fp["unit"]).toBe("mt (meters)"));
  it("wavelength = 1310.0 nm", () => expect(fp["wavelength"]).toBe("1310.0 nm"));
  it("acquisition offset = 0", () => expect(fp["acquisition offset"]).toBe(0));
  it("pulse width = 1000 ns", () => expect(fp["pulse width"]).toBe("1000 ns"));
  it("sample spacing = 0.02499999 usec", () =>
    expect(fp["sample spacing"]).toBe("0.02499999 usec"));
  it("num data points = 11776", () => expect(fp["num data points"]).toBe(11776));
  it("index = 1.471100", () => expect(fp["index"]).toBe("1.471100"));
  it("BC = -81.50 dB", () => expect(fp["BC"]).toBe("-81.50 dB"));
  it("num averages = 30", () => expect(fp["num averages"]).toBe(30));
  it("loss thr = 0.000 dB", () => expect(fp["loss thr"]).toBe("0.000 dB"));
  it("refl thr = -0.000 dB (negative zero)", () => expect(fp["refl thr"]).toBe("-0.000 dB"));
  it("EOT thr = 5.000 dB", () => expect(fp["EOT thr"]).toBe("5.000 dB"));
  it("resolution matches pyOTDR", () =>
    expect(fp.resolution).toBeCloseTo(5.094696792927346, 10));
  it("range matches pyOTDR", () =>
    expect(fp.range).toBeCloseTo(59.99514943351243, 10));
  it("no averaging time in v1", () => expect(fp["averaging time"]).toBeUndefined());
  it("no trace type in v1", () => expect(fp["trace type"]).toBeUndefined());
});

// ═══════════════════════════════════════════════════════════════════════════
// sample1310_lowDR.sor (v2)
// ═══════════════════════════════════════════════════════════════════════════
describe("sample1310_lowDR.sor (v2) — GenParams", () => {
  const { reader, format, blocks } = loadSor("sample1310_lowDR.sor");
  const gp = parseGenParams(reader, blocks, format);

  it("language = EN", () => expect(gp.language).toBe("EN"));
  it("fiber type = G.652 (standard SMF)", () =>
    expect(gp["fiber type"]).toBe("G.652 (standard SMF)"));
  it("wavelength = 1310 nm", () => expect(gp.wavelength).toBe("1310 nm"));
  it("build condition = BC (as-built)", () =>
    expect(gp["build condition"]).toBe("BC (as-built)"));
  it("user offset = 0", () => expect(gp["user offset"]).toBe("0"));
  it("user offset distance = 0 (v2)", () =>
    expect(gp["user offset distance"]).toBe("0"));
});

describe("sample1310_lowDR.sor (v2) — SupParams", () => {
  const { reader, format, blocks } = loadSor("sample1310_lowDR.sor");
  const sp = parseSupParams(reader, blocks, format);

  it("supplier = OptixS", () => expect(sp.supplier).toBe("OptixS"));
  it("OTDR = OPXOTDR", () => expect(sp.OTDR).toBe("OPXOTDR  "));
  it("software", () => expect(sp.software).toBe("v9.09  VA=110105"));
});

describe("sample1310_lowDR.sor (v2) — FxdParams", () => {
  const { reader, format, blocks } = loadSor("sample1310_lowDR.sor");
  const fp = parseFxdParams(reader, blocks, format);

  it("date/time matches", () =>
    expect(fp["date/time"]).toBe("Tue Nov 22 08:49:23 2011 (1321951763 sec)"));
  it("unit = km (kilometers)", () => expect(fp["unit"]).toBe("km (kilometers)"));
  it("wavelength = 1310.0 nm", () => expect(fp["wavelength"]).toBe("1310.0 nm"));
  it("index = 1.475000", () => expect(fp["index"]).toBe("1.475000"));
  it("averaging time = 15 sec", () => expect(fp["averaging time"]).toBe("15 sec"));
  it("trace type = ST[standard trace]", () =>
    expect(fp["trace type"]).toBe("ST[standard trace]"));
  it("refl thr = -40.000 dB", () => expect(fp["refl thr"]).toBe("-40.000 dB"));
  it("range matches", () => expect(fp.range).toBeCloseTo(79.958173424989, 8));
  it("resolution matches", () => expect(fp.resolution).toBeCloseTo(5.081226069203674, 10));
  it("X1=0, Y1=0, X2=0, Y2=0", () => {
    expect(fp["X1"]).toBe(0);
    expect(fp["Y1"]).toBe(0);
    expect(fp["X2"]).toBe(0);
    expect(fp["Y2"]).toBe(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// M200_Sample_005_S13.sor (v1, Noyes)
// ═══════════════════════════════════════════════════════════════════════════
describe("M200_Sample_005_S13.sor (v1) — GenParams", () => {
  const { reader, format, blocks } = loadSor("M200_Sample_005_S13.sor");
  const gp = parseGenParams(reader, blocks, format);

  it("cable ID = M200_DEMO_D", () => expect(gp["cable ID"]).toBe("M200_DEMO_D"));
  it("fiber ID = 005", () => expect(gp["fiber ID"]).toBe("005"));
  it("location A = Conant", () => expect(gp["location A"]).toBe("Conant"));
  it("location B = Morrill", () => expect(gp["location B"]).toBe("Morrill"));
  it("operator = SUZY", () => expect(gp["operator"]).toBe("SUZY"));
  it("build condition = BC (as-built)", () =>
    expect(gp["build condition"]).toBe("BC (as-built)"));
  it("user offset = 7475", () => expect(gp["user offset"]).toBe("7475"));
});

describe("M200_Sample_005_S13.sor (v1) — SupParams", () => {
  const { reader, format, blocks } = loadSor("M200_Sample_005_S13.sor");
  const sp = parseSupParams(reader, blocks, format);

  it("supplier = Noyes", () => expect(sp.supplier).toBe("Noyes"));
  it("OTDR = M200", () => expect(sp.OTDR).toBe("M200"));
  it("software = 0.0.14", () => expect(sp.software).toBe("0.0.14"));
});

describe("M200_Sample_005_S13.sor (v1) — FxdParams", () => {
  const { reader, format, blocks } = loadSor("M200_Sample_005_S13.sor");
  const fp = parseFxdParams(reader, blocks, format);

  it("date/time matches", () =>
    expect(fp["date/time"]).toBe("Sat Jun 17 10:01:11 2006 (1150538471 sec)"));
  it("wavelength = 131.0 nm", () => expect(fp["wavelength"]).toBe("131.0 nm"));
  it("num data points = 16000", () => expect(fp["num data points"]).toBe(16000));
  it("index = 1.467700", () => expect(fp["index"]).toBe("1.467700"));
  it("BC = -77.00 dB", () => expect(fp["BC"]).toBe("-77.00 dB"));
  it("refl thr = -65.000 dB", () => expect(fp["refl thr"]).toBe("-65.000 dB"));
  it("range matches pyOTDR", () => expect(fp.range).toBeCloseTo(8.17040152619745, 8));
  it("resolution matches pyOTDR", () =>
    expect(fp.resolution).toBeCloseTo(0.5106500953873406, 10));
});
