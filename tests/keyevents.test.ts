/**
 * Tests for KeyEvents parser.
 * Expected values from pyOTDR reference JSON dumps.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { BinaryReader } from "../src/reader.js";
import { parseMapBlock } from "../src/mapblock.js";
import { parseFxdParams } from "../src/fxdparams.js";
import { parseKeyEvents } from "../src/keyevents.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixtures = join(__dirname, "fixtures");

function loadAll(filename: string) {
  const data = new Uint8Array(readFileSync(join(fixtures, filename)));
  const reader = new BinaryReader(data);
  const { format, blocks } = parseMapBlock(reader);
  const fp = parseFxdParams(reader, blocks, format);
  const ke = parseKeyEvents(reader, blocks, format, fp);
  return { reader, format, blocks, fp, ke };
}

// ── demo_ab.sor (v1, 5 events) ───────────────────────────────────────────────
describe("demo_ab.sor (v1) — KeyEvents", () => {
  const { ke } = loadAll("demo_ab.sor");

  it("num events = 5", () => expect(ke["num events"]).toBe(5));

  it("event 1: reflection at 0.000 km", () => {
    const e = ke["event 1"] as Record<string, string>;
    expect(e["type"]).toBe("1F9999LS {auto} reflection");
    expect(e["distance"]).toBe("0.000");
    expect(e["slope"]).toBe("0.000");
    expect(e["splice loss"]).toBe("0.000");
    expect(e["refl loss"]).toBe("-50.000");
  });

  it("event 2: loss at 12.711 km", () => {
    const e = ke["event 2"] as Record<string, string>;
    expect(e["type"]).toBe("0F9999LS {auto} loss/drop/gain");
    expect(e["distance"]).toBe("12.711");
    expect(e["slope"]).toBe("0.344");
    expect(e["splice loss"]).toBe("0.209");
  });

  it("event 5: end-of-fiber reflection at 50.728 km", () => {
    const e = ke["event 5"] as Record<string, string>;
    expect(e["type"]).toBe("1E9999LS {auto} reflection");
    expect(e["distance"]).toBe("50.728");
    expect(e["splice loss"]).toBe("13.232");
    expect(e["refl loss"]).toBe("-16.726");
  });

  it("no v2 position fields in v1 events", () => {
    const e = ke["event 1"] as Record<string, string>;
    expect(e["end of prev"]).toBeUndefined();
    expect(e["start of curr"]).toBeUndefined();
  });

  it("Summary: total loss = 0.0", () => expect(ke.Summary["total loss"]).toBe(0.0));
  it("Summary: ORL = 0.0", () => expect(ke.Summary.ORL).toBe(0.0));
  it("Summary: loss end = 50.727876", () => expect(ke.Summary["loss end"]).toBeCloseTo(50.727876, 5));
});

// ── sample1310_lowDR.sor (v2, 3 events) ──────────────────────────────────────
describe("sample1310_lowDR.sor (v2) — KeyEvents", () => {
  const { ke } = loadAll("sample1310_lowDR.sor");

  it("num events = 3", () => expect(ke["num events"]).toBe(3));

  it("event 1: distance=0.000", () => {
    const e = ke["event 1"] as Record<string, string>;
    expect(e["distance"]).toBe("0.000");
    expect(e["type"]).toBe("0F9999LS {auto} loss/drop/gain");
    expect(e["refl loss"]).toBe("-44.177");
  });

  it("event 1 has v2 position fields", () => {
    const e = ke["event 1"] as Record<string, string>;
    expect(e["end of prev"]).toBe("0.000");
    expect(e["start of curr"]).toBe("0.000");
    expect(e["end of curr"]).toBe("0.308");
    expect(e["start of next"]).toBe("2.020");
    expect(e["peak"]).toBe("0.038");
  });

  it("event 3: end-of-fiber at 17.065", () => {
    const e = ke["event 3"] as Record<string, string>;
    expect(e["type"]).toBe("1E9999LS {auto} reflection");
    expect(e["distance"]).toBe("17.065");
    expect(e["splice loss"]).toBe("22.820");
    expect(e["refl loss"]).toBe("-38.395");
  });

  it("Summary: total loss = 6.39", () => expect(ke.Summary["total loss"]).toBe(6.39));
  it("Summary: ORL = 32.392", () => expect(ke.Summary.ORL).toBeCloseTo(32.392, 3));
});

// ── M200_Sample_005_S13.sor (v1, 5 events) ───────────────────────────────────
describe("M200_Sample_005_S13.sor (v1) — KeyEvents", () => {
  const { ke } = loadAll("M200_Sample_005_S13.sor");

  it("num events = 5", () => expect(ke["num events"]).toBe(5));

  it("event 1: Link Start comment", () => {
    const e = ke["event 1"] as Record<string, string>;
    expect(e["comments"]).toBe("Link Start");
    expect(e["distance"]).toBe("0.000");
    expect(e["refl loss"]).toBe("-44.478");
  });

  it("event 5: end-of-fiber at 3.787", () => {
    const e = ke["event 5"] as Record<string, string>;
    expect(e["type"]).toBe("1E9999LS {auto} reflection");
    expect(e["distance"]).toBe("3.787");
  });

  it("Summary: total loss = 2.564", () => expect(ke.Summary["total loss"]).toBe(2.564));
  it("Summary: ORL = 30.279", () => expect(ke.Summary.ORL).toBeCloseTo(30.279, 3));
  it("Summary: loss end matches", () =>
    expect(ke.Summary["loss end"]).toBeCloseTo(3.787226, 5));
});
