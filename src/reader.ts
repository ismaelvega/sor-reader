/**
 * BinaryReader — DataView-based sequential binary reader with CRC16-CCITT accumulation.
 *
 * Mirrors the Python FH class from parts.py:
 * - All reads are little-endian
 * - Every byte read is fed to the running CRC accumulator
 * - seek(0) resets the cursor AND resets the CRC (for v1/v2 header detection)
 * - digest() finalises and returns the CRC value
 */

import { CRC16 } from "./checksum.js";

export class BinaryReader {
  private view: DataView;
  private data: Uint8Array;
  private offset: number = 0;
  private crc: CRC16;
  private decoder: TextDecoder;

  constructor(data: Uint8Array) {
    this.data = data;
    this.view = new DataView(data.buffer, data.byteOffset, data.byteLength);
    this.crc = new CRC16();
    this.decoder = new TextDecoder("utf-8");
  }

  /** Current byte position in the file. */
  tell(): number {
    return this.offset;
  }

  /** Total file size. */
  size(): number {
    return this.data.length;
  }

  /**
   * Seek to an absolute position.
   * ONLY seek(0) is supported cleanly (resets CRC). Arbitrary seeks are used
   * by block processors that know the exact block start position from the map block.
   * Those do NOT reset the CRC — they are used after the CRC path has already
   * consumed those bytes via the sequential map-order processing.
   */
  seek(pos: number): void {
    if (pos === 0) {
      this.crc.reset();
    }
    this.offset = pos;
  }

  /**
   * Read n raw bytes, feeding them into the CRC accumulator.
   * Returns a copy as Uint8Array.
   */
  read(n: number): Uint8Array {
    if (this.offset + n > this.data.length) {
      throw new RangeError(
        `BinaryReader.read(${n}): only ${this.data.length - this.offset} bytes remain at offset ${this.offset}`,
      );
    }
    const slice = this.data.slice(this.offset, this.offset + n);
    this.crc.update(slice);
    this.offset += n;
    return slice;
  }

  /**
   * Read bytes WITHOUT advancing the CRC — used by block processors that need
   * to re-position after the map stage has already accounted for those bytes.
   * For "slurp" (unknown blocks), use skip() instead.
   */
  readNoCRC(n: number): Uint8Array {
    if (this.offset + n > this.data.length) {
      throw new RangeError(
        `BinaryReader.readNoCRC(${n}): only ${this.data.length - this.offset} bytes remain`,
      );
    }
    const slice = this.data.slice(this.offset, this.offset + n);
    this.offset += n;
    return slice;
  }

  /** Read and discard n bytes, feeding them to the CRC (used for unknown/vendor blocks). */
  skip(n: number): void {
    this.read(n);
  }

  /** Read unsigned integer, little-endian. nbytes must be 2, 4, or 8. */
  getUint(nbytes: 2 | 4 | 8): number {
    const buf = this.read(nbytes);
    const v = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
    if (nbytes === 2) return v.getUint16(0, true);
    if (nbytes === 4) return v.getUint32(0, true);
    // 8-byte: use BigInt then clamp to number (safe up to 2^53)
    return Number(v.getBigUint64(0, true));
  }

  /** Read signed integer, little-endian. nbytes must be 2, 4, or 8. */
  getSigned(nbytes: 2 | 4 | 8): number {
    const buf = this.read(nbytes);
    const v = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
    if (nbytes === 2) return v.getInt16(0, true);
    if (nbytes === 4) return v.getInt32(0, true);
    return Number(v.getBigInt64(0, true));
  }

  /** Read IEEE 754 float, little-endian. nbytes must be 4 or 8. */
  getFloat(nbytes: 4 | 8): number {
    const buf = this.read(nbytes);
    const v = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
    if (nbytes === 4) return v.getFloat32(0, true);
    return v.getFloat64(0, true);
  }

  /**
   * Read exactly nbytes and return as a hex string like "64 00 94 00 ".
   * Mirrors parts.get_hex().
   */
  getHex(nbytes: number): string {
    const buf = this.read(nbytes);
    let result = "";
    for (let i = 0; i < buf.length; i++) {
      result += buf[i]!.toString(16).toUpperCase().padStart(2, "0") + " ";
    }
    return result;
  }

  /**
   * Read a null-terminated UTF-8 string, consuming the null byte.
   * Mirrors parts.get_string().
   */
  getString(): string {
    const bytes: number[] = [];
    while (this.offset < this.data.length) {
      const byte = this.read(1)[0]!;
      if (byte === 0x00) break;
      bytes.push(byte);
    }
    return this.decoder.decode(new Uint8Array(bytes));
  }

  /**
   * Read exactly n bytes as a raw string (no null terminator), decoded as UTF-8.
   * Used for fixed-width string fields like unit (2 bytes), build condition (2 bytes).
   */
  getRawString(n: number): string {
    const buf = this.read(n);
    return this.decoder.decode(buf);
  }

  /** Finalise and return the CRC16-CCITT value accumulated so far. */
  digest(): number {
    return this.crc.digest();
  }
}
