/**
 * Browser compatibility tests.
 *
 * Verifies that:
 * 1. parseSor() works with a plain Uint8Array (no Node.js Buffer)
 * 2. Only Web APIs are used by the core parser (TextDecoder, DataView, Uint8Array)
 * 3. The browser entry point exports the expected symbols
 * 4. parseSorFile is NOT exported from the browser entry point
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

// Import from the SOURCE browser entry (Vitest resolves .ts directly)
import * as browserExports from "../src/browser.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixtures = join(__dirname, "fixtures");

describe("Browser entry point exports", () => {
  it("exports parseSor", () => expect(typeof browserExports.parseSor).toBe("function"));
  it("exports toJSON", () => expect(typeof browserExports.toJSON).toBe("function"));
  it("exports traceToString", () => expect(typeof browserExports.traceToString).toBe("function"));
  it("exports VERSION", () => expect(typeof browserExports.VERSION).toBe("string"));

  it("does NOT export parseSorFile", () => {
    expect((browserExports as Record<string, unknown>)["parseSorFile"]).toBeUndefined();
  });
});

describe("parseSor with plain Uint8Array (browser-compatible input)", () => {
  // Read raw bytes using Node.js only to get the data, then strip the Buffer wrapper
  const rawBytes = readFileSync(join(fixtures, "demo_ab.sor"));
  // Create a genuine Uint8Array (not a Buffer subclass)
  const plainArray = new Uint8Array(rawBytes.buffer, rawBytes.byteOffset, rawBytes.byteLength);

  const result = browserExports.parseSor(plainArray, "demo_ab.sor");

  it("parseSor returns a result", () => expect(result).toBeDefined());
  it("format is 1", () => expect(result.format).toBe(1));
  it("checksum matches", () => expect(result.Cksum.match).toBe(true));
  it("correct number of data points", () => expect(result.FxdParams["num data points"]).toBe(11776));
  it("trace has correct length", () => expect(result.trace.length).toBe(11776));

  it("toJSON produces valid JSON", () => {
    const json = browserExports.toJSON(result);
    const parsed = JSON.parse(json) as Record<string, unknown>;
    expect(parsed["GenParams"]).toBeDefined();
    expect(parsed["FxdParams"]).toBeDefined();
  });

  it("traceToString produces tab-separated output", () => {
    const str = browserExports.traceToString(result.trace);
    const lines = str.split("\n").filter((l) => l.length > 0);
    expect(lines.length).toBe(11776);
    // Each line should be two numbers separated by a tab
    expect(lines[0]).toMatch(/^\d+\.\d+\t\d+\.\d+$/);
  });
});

describe("parseSor with copied Uint8Array (no shared buffer)", () => {
  // Simulate receiving data via fetch() ArrayBuffer in a browser
  const rawBytes = readFileSync(join(fixtures, "M200_Sample_005_S13.sor"));
  // Copy to a fresh ArrayBuffer to simulate browser fetch response
  const arraybuffer = rawBytes.buffer.slice(
    rawBytes.byteOffset,
    rawBytes.byteOffset + rawBytes.byteLength,
  );
  const browserLike = new Uint8Array(arraybuffer);

  it("parses successfully from a detached ArrayBuffer", () => {
    const result = browserExports.parseSor(browserLike, "M200_Sample_005_S13.sor");
    expect(result.format).toBe(1);
    expect(result.Cksum.match).toBe(true);
    expect(result.FxdParams["num data points"]).toBe(16000);
  });
});

describe("Core APIs used are browser-safe", () => {
  it("TextDecoder is available (Web Encoding API)", () => {
    expect(typeof TextDecoder).toBe("function");
    const dec = new TextDecoder("utf-8");
    expect(dec.decode(new Uint8Array([72, 101, 108, 108, 111]))).toBe("Hello");
  });

  it("DataView is available", () => {
    expect(typeof DataView).toBe("function");
    const buf = new ArrayBuffer(4);
    const view = new DataView(buf);
    view.setUint32(0, 0xdeadbeef, true);
    expect(view.getUint32(0, true)).toBe(0xdeadbeef);
  });

  it("Uint8Array is available", () => {
    expect(typeof Uint8Array).toBe("function");
    const arr = new Uint8Array([1, 2, 3]);
    expect(arr.length).toBe(3);
  });
});
