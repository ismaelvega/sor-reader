# sor-reader

Zero-dependency TypeScript parser for **OTDR SOR files** (Standard OTDR Record, Bellcore/Telcordia SR-4731 v1.x and v2.x).

Works in **Node.js ≥ 18** and modern **browsers** (via Uint8Array — no Buffer required).

---

## Features

- Full SOR v1 and v2 support
- Parses all standard blocks: MapBlock, GenParams, SupParams, FxdParams, KeyEvents, DataPts, Cksum
- CRC16-CCITT checksum verification
- Trace data export as tab-separated `.dat` (identical to pyOTDR output)
- JSON output matching [pyOTDR](https://github.com/sid5432/pyOTDR) (sorted keys, 8-space indent)
- Browser-safe entry point (`sor-reader`) — no Node.js APIs in the core
- CLI tool for quick file processing
- Full TypeScript types and JSDoc

---

## Installation

```bash
npm install sor-reader
```

---

## Quick Start

### Node.js

```typescript
import { parseSorFile, toJSON, traceToString } from "sor-reader";

const result = await parseSorFile("measurement.sor");

console.log(`Format: v${result.format}`);
console.log(`Data points: ${result.FxdParams["num data points"]}`);
console.log(`Wavelength: ${result.FxdParams.wavelength}`);
console.log(`Checksum OK: ${result.Cksum.match}`);

// Write pyOTDR-compatible JSON
import { writeFileSync } from "fs";
writeFileSync("measurement-dump.json", toJSON(result));

// Write trace data
writeFileSync("measurement-trace.dat", traceToString(result.trace));
```

### Browser / Bundler

```typescript
import { parseSor, toJSON, traceToString } from "sor-reader";

// From a file input or fetch response
const response = await fetch("measurement.sor");
const buffer = await response.arrayBuffer();
const data = new Uint8Array(buffer);

const result = parseSor(data, "measurement.sor");
console.log(toJSON(result));
```

### CommonJS

```javascript
const { parseSorFile, toJSON } = require("sor-reader");
```

---

## CLI

```bash
# Parse a single file (writes measurement-dump.json + measurement-trace.dat)
npx sor-reader measurement.sor

# Multiple files
npx sor-reader *.sor

# Print JSON to stdout only
npx sor-reader --stdout --no-trace measurement.sor

# Skip JSON output
npx sor-reader --no-json measurement.sor
```

### CLI Options

| Option | Description |
|---|---|
| `--json` / `--no-json` | Write JSON dump (default: enabled) |
| `--trace` / `--no-trace` | Write trace `.dat` file (default: enabled) |
| `--stdout` | Print JSON to stdout instead of file |
| `--help`, `-h` | Show help |
| `--version`, `-v` | Print version |

---

## API Reference

### `parseSor(data, filename?, options?)`

Parse a SOR file from a `Uint8Array`.

```typescript
function parseSor(
  data: Uint8Array,
  filename?: string,
  options?: ParseOptions,
): SorResult
```

### `parseSorFile(filepath, options?)` _(Node.js only)_

Parse a SOR file from a filesystem path.

```typescript
async function parseSorFile(
  filepath: string,
  options?: ParseOptions,
): Promise<SorResult>
```

### `toJSON(result)`

Serialize a `SorResult` to a JSON string compatible with pyOTDR output (sorted keys, 8-space indent).

```typescript
function toJSON(result: SorResult): string
```

### `traceToString(trace)`

Convert trace data to a tab-separated string (`distance\tpower\n` per line).

```typescript
function traceToString(trace: TracePoint[]): string
```

---

## `SorResult` Structure

```typescript
interface SorResult {
  filename: string;
  format: 1 | 2;           // SOR version
  version: string;          // e.g. "2.00"
  mapblock: MapBlockInfo;
  blocks: Record<string, BlockInfo>;
  GenParams: GenParamsRaw;  // General parameters
  SupParams: SupParamsRaw;  // Supplier parameters
  FxdParams: FxdParamsRaw;  // Fixed parameters (wavelength, range, etc.)
  KeyEvents: KeyEventsRaw;  // Detected events and summary
  DataPts: DataPtsRaw;      // Trace metadata
  Cksum: CksumRaw;          // Checksum verification
  trace: TracePoint[];      // [{distance, power}, ...] in km / dB
}
```

### Key fields

| Field | Type | Description |
|---|---|---|
| `FxdParams["wavelength"]` | `string` | e.g. `"1310 nm"` |
| `FxdParams["num data points"]` | `number` | Number of trace samples |
| `FxdParams["range"]` | `number` | Measurement range in km |
| `FxdParams["resolution"]` | `number` | Sample resolution in m |
| `FxdParams["index"]` | `number` | Group index of refraction |
| `FxdParams["date/time"]` | `string` | Human-readable timestamp |
| `KeyEvents["num events"]` | `number` | Number of detected events |
| `Cksum.match` | `boolean` | Whether checksum is valid |
| `trace[i].distance` | `number` | Distance in km |
| `trace[i].power` | `number` | Signal level in dB |

---

## Compatibility

| Environment | Support |
|---|---|
| Node.js ≥ 18 | Full (including `parseSorFile`) |
| Node.js 16 | Core `parseSor` only (no `parseArgs` for CLI) |
| Browsers (modern) | `sor-reader` entry — all features except `parseSorFile` |
| Deno | Use `parseSor` with `Uint8Array` from `Deno.readFile` |
| Bun | Full support |

---

## Comparison with pyOTDR

| Feature | pyOTDR (Python) | sor-reader (TS) |
|---|---|---|
| SOR v1 | ✅ | ✅ |
| SOR v2 | ✅ | ✅ |
| CRC16 checksum | ✅ | ✅ |
| Trace output | ✅ | ✅ (byte-identical) |
| JSON output | ✅ | ✅ (byte-identical) |
| Browser support | ❌ | ✅ |
| TypeScript types | ❌ | ✅ |
| Zero dependencies | ❌ (crc pkg) | ✅ |
| CLI | ✅ | ✅ |

---

## SOR File Format

SOR files follow the Bellcore/Telcordia SR-4731 standard for OTDR (Optical Time-Domain Reflectometer) measurements. The format stores:

- **General parameters**: fiber type, cable ID, operator, location
- **Supplier parameters**: OTDR make/model, firmware version
- **Fixed parameters**: wavelength, pulse width, measurement range, IOR
- **Key events**: detected splices, reflections, and end-of-fiber
- **Data points**: raw backscatter trace samples
- **Checksum**: CRC16-CCITT over all preceding bytes

---

## License

MIT — see [LICENSE](LICENSE).

Ported from [pyOTDR](https://github.com/sid5432/pyOTDR) (GPL-3.0) by Sidney Li.
The port is a clean-room reimplementation in TypeScript, licensed under MIT.
