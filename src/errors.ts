/** Base class for all SOR parsing errors. */
export class SorParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SorParseError";
  }
}

/** Thrown when a block header does not match the expected block name. */
export class InvalidBlockError extends SorParseError {
  constructor(expected: string, got: string) {
    super(`Invalid block header: expected "${expected}", got "${got}"`);
    this.name = "InvalidBlockError";
  }
}

/** Thrown when the computed CRC16 does not match the stored checksum. */
export class ChecksumMismatchError extends SorParseError {
  constructor(
    public readonly calculated: number,
    public readonly stored: number,
  ) {
    super(`Checksum mismatch: calculated 0x${calculated.toString(16).toUpperCase()}, stored 0x${stored.toString(16).toUpperCase()}`);
    this.name = "ChecksumMismatchError";
  }
}

/** Thrown for features that exist in the SOR format but are not yet implemented. */
export class UnsupportedFeatureError extends SorParseError {
  constructor(feature: string) {
    super(`Unsupported SOR feature: ${feature}`);
    this.name = "UnsupportedFeatureError";
  }
}

/** Thrown when a required block is missing from the SOR file. */
export class MissingBlockError extends SorParseError {
  constructor(blockName: string) {
    super(`Required block "${blockName}" not found in SOR file`);
    this.name = "MissingBlockError";
  }
}
