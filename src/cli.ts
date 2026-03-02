/**
 * sor-reader CLI — parse one or more SOR files and write JSON + trace output.
 *
 * Usage:
 *   sor-reader [options] <file.sor> [file2.sor ...]
 *
 * Options:
 *   --json          Write <basename>-dump.json  (default: true)
 *   --trace         Write <basename>-trace.dat  (default: true)
 *   --no-json       Skip JSON output
 *   --no-trace      Skip trace output
 *   --stdout        Print JSON to stdout instead of file
 *   --help, -h      Show this message
 *   --version, -v   Print version
 *
 * Node.js >= 18.3 required (uses native util.parseArgs).
 */

import { parseArgs } from "util";
import { writeFileSync } from "fs";
import { basename, extname, join, dirname } from "path";
import { parseSorFile, toJSON, traceToString, VERSION } from "./index.js";

// ── Help & version ────────────────────────────────────────────────────────────

function printHelp(): void {
  console.log(`
Usage: sor-reader [options] <file.sor> [file2.sor ...]

Parse one or more OTDR SOR files and write JSON dump and/or trace data.

Options:
  --json          Write <basename>-dump.json (default)
  --no-json       Skip JSON output
  --trace         Write <basename>-trace.dat (default)
  --no-trace      Skip trace output
  --stdout        Print JSON to stdout instead of writing to file
  --help,    -h   Show this help message
  --version, -v   Print version and exit

Examples:
  sor-reader measurement.sor
  sor-reader --no-trace measurement.sor
  sor-reader --stdout measurement.sor
  sor-reader *.sor
`.trim());
}

// ── Argument parsing ──────────────────────────────────────────────────────────

const { values, positionals } = parseArgs({
  args: process.argv.slice(2),
  options: {
    json:       { type: "boolean" },
    "no-json":  { type: "boolean" },
    trace:      { type: "boolean" },
    "no-trace": { type: "boolean" },
    stdout:     { type: "boolean", default: false },
    help:       { type: "boolean", short: "h", default: false },
    version:    { type: "boolean", short: "v", default: false },
  },
  allowPositionals: true,
});

// --json/--no-json default to true; explicit --no-json overrides
const writeJson  = values["no-json"]  ? false : (values["json"]  ?? true);
const writeTrace = values["no-trace"] ? false : (values["trace"] ?? true);

if (values.help) {
  printHelp();
  process.exit(0);
}

if (values.version) {
  console.log(`sor-reader v${VERSION}`);
  process.exit(0);
}

if (positionals.length === 0) {
  console.error("Error: no SOR file(s) specified.");
  printHelp();
  process.exit(1);
}

// ── Process files ─────────────────────────────────────────────────────────────

let exitCode = 0;

for (const filepath of positionals) {
  try {
    const result = await parseSorFile(filepath);
    const base = join(dirname(filepath), basename(filepath, extname(filepath)));

    if (writeJson) {
      const jsonStr = toJSON(result);
      if (values.stdout) {
        console.log(jsonStr);
      } else {
        const outPath = `${base}-dump.json`;
        writeFileSync(outPath, jsonStr + "\n", "utf-8");
        console.log(`Wrote ${outPath}`);
      }
    }

    if (writeTrace) {
      const traceStr = traceToString(result.trace);
      const outPath = `${base}-trace.dat`;
      writeFileSync(outPath, traceStr, "utf-8");
      console.log(`Wrote ${outPath}`);
    }

    // Print a brief summary to stderr so it doesn't pollute --stdout output
    const ck = result.Cksum;
    const ckStatus = ck.match ? "OK" : `MISMATCH (stored=${ck.checksum}, ours=${ck.checksum_ours})`;
    console.error(
      `${result.filename}: format=v${result.format}, ` +
      `${result.FxdParams["num data points"]} pts, ` +
      `checksum=${ckStatus}`,
    );
  } catch (err) {
    console.error(`Error processing ${filepath}: ${(err as Error).message}`);
    exitCode = 1;
  }
}

process.exit(exitCode);
