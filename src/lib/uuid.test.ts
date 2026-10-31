import { afterEach, describe, expect, it, vi } from "vitest";
import { uuid } from "./uuid";

const V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

describe("uuid", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("returns a v4 uuid", () => {
    expect(uuid()).toMatch(V4);
  });

  // Phones on the local network load the app over plain http, where browsers hide crypto.randomUUID
  it("still works when crypto.randomUUID is missing", () => {
    vi.stubGlobal("crypto", {
      getRandomValues: crypto.getRandomValues.bind(crypto),
    });
    const a = uuid();
    const b = uuid();
    expect(a).toMatch(V4);
    expect(a).not.toBe(b);
  });
});
