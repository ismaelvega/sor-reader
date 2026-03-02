import { describe, it, expect } from "vitest";
import { VERSION } from "../src/index.js";

describe("scaffold", () => {
  it("package is importable", () => {
    expect(VERSION).toBe("1.0.0");
  });
});
