/**
 * Physical constants and lookup tables used throughout the SOR parser.
 * Mirrors the constants scattered across pyOTDR's parts.py and module-level vars.
 */

/** Speed of light in vacuum, km/microsecond. */
export const SOL = 299792.458 / 1.0e6; // 0.299792458 km/usec

/** Map from 2-char distance unit codes to human-readable labels. */
export const UNIT_MAP: Readonly<Record<string, string>> = {
  mt: "meters",
  km: "kilometers",
  mi: "miles",
  kf: "kilo-ft",
};

/** Map from 2-char trace type codes to human-readable labels (v2 only). */
export const TRACE_TYPE_MAP: Readonly<Record<string, string>> = {
  ST: "standard trace",
  RT: "reverse trace",
  DT: "difference trace",
  RF: "reference",
};

/** Map from 2-char build condition codes to human-readable labels. */
export const BUILD_CONDITION_MAP: Readonly<Record<string, string>> = {
  BC: "as-built",
  CC: "as-current",
  RC: "as-repaired",
  OT: "other",
};

/**
 * Decode an ITU-T fiber type code (G.6xx) to a description string.
 * Mirrors genparams.fiber_type() in pyOTDR.
 */
export function decodeFiberType(val: number): string {
  const map: Record<number, string> = {
    651: "G.651 (50um core multimode)",
    652: "G.652 (standard SMF)",
    653: "G.653 (dispersion-shifted fiber)",
    654: "G.654 (1550nm loss-minimzed fiber)",
    655: "G.655 (nonzero dispersion-shifted fiber)",
  };
  return map[val] ?? `${val} (unknown)`;
}

/**
 * Decode a 2-char build condition code to a display string.
 * Mirrors genparams.build_condition() in pyOTDR.
 */
export function decodeBuildCondition(code: string): string {
  const label = BUILD_CONDITION_MAP[code];
  return label ? `${code} (${label})` : `${code} (unknown)`;
}
