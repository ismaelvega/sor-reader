# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-03-02

### Added

- `parseSor(data, filename?, options?)` — parse SOR v1 and v2 from `Uint8Array`
- `parseSorFile(filepath)` — async Node.js helper
- `toJSON(result)` — pyOTDR-compatible JSON output (sorted keys, 8-space indent)
- `traceToString(trace)` — tab-separated trace data (byte-identical to pyOTDR output)
- Full SOR block support: MapBlock, GenParams, SupParams, FxdParams, KeyEvents, DataPts, Cksum
- CRC16-CCITT checksum verification (does not throw on mismatch)
- `sor-reader/browser` entry point — browser-safe subset (excludes `parseSorFile`)
- CLI tool: `sor-reader <file.sor>` writes `<base>-dump.json` and `<base>-trace.dat`
- TypeScript strict mode, dual ESM+CJS build, full `.d.ts` declarations
- Zero runtime dependencies
