import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { crc16ccitt, CRC16 } from "../src/checksum.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixtures = join(__dirname, "fixtures");

describe("CRC16-CCITT", () => {
  it("passes standard test vector: crc16('123456789') === 0x29B1", () => {
    const data = new TextEncoder().encode("123456789");
    expect(crc16ccitt(data)).toBe(0x29b1);
  });

  it("returns INIT (0xFFFF) for empty data", () => {
    expect(crc16ccitt(new Uint8Array(0))).toBe(0xffff);
  });

  it("incremental CRC16 matches one-shot for demo_ab.sor", () => {
    const data = new Uint8Array(readFileSync(join(fixtures, "demo_ab.sor")));
    // File checksum is stored in last 2 bytes (little-endian uint16)
    const storedChecksum = data[data.length - 2]! | (data[data.length - 1]! << 8);
    const payload = data.slice(0, data.length - 2);

    // One-shot
    expect(crc16ccitt(payload)).toBe(storedChecksum);
    expect(storedChecksum).toBe(38827);

    // Incremental via CRC16 class
    const acc = new CRC16();
    acc.update(payload.slice(0, 1000));
    acc.update(payload.slice(1000));
    expect(acc.digest()).toBe(storedChecksum);
  });

  it("CRC16 reset works correctly", () => {
    const data = new TextEncoder().encode("123456789");
    const acc = new CRC16();
    acc.update(data);
    const first = acc.digest();
    acc.reset();
    acc.update(data);
    expect(acc.digest()).toBe(first);
  });
});
