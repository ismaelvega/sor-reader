/**
 * CRC-16/CCITT-FALSE implementation
 *
 * Polynomial: 0x1021
 * Initial value: 0xFFFF
 * XOR out: 0x0000
 * Bit reversal: none (not reflected)
 *
 * Standard test vector: crc16ccitt(Buffer.from("123456789")) === 0x29B1
 */

const POLY = 0x1021;
const INIT = 0xffff;

/** Compute CRC16-CCITT over an entire Uint8Array in one shot. */
export function crc16ccitt(data: Uint8Array, initial: number = INIT): number {
  let crc = initial;
  for (let i = 0; i < data.length; i++) {
    crc ^= (data[i]! << 8) & 0xffff;
    for (let j = 0; j < 8; j++) {
      if (crc & 0x8000) {
        crc = ((crc << 1) ^ POLY) & 0xffff;
      } else {
        crc = (crc << 1) & 0xffff;
      }
    }
  }
  return crc;
}

/** Incremental CRC16-CCITT accumulator — feed data in chunks, call digest() at end. */
export class CRC16 {
  private crc: number = INIT;

  update(data: Uint8Array): void {
    this.crc = crc16ccitt(data, this.crc);
  }

  digest(): number {
    return this.crc;
  }

  reset(): void {
    this.crc = INIT;
  }
}
