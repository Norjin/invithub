import { drawSecretSanta } from "./secret-santa";
import { seededRandom } from "@/server/test-utils";

describe("drawSecretSanta", () => {
  it("needs at least two people", () => {
    expect(drawSecretSanta([]).ok).toBe(false);
    expect(drawSecretSanta(["a"]).ok).toBe(false);
    expect(drawSecretSanta(["a", "a"]).ok).toBe(false);
  });

  it("pairs two people with each other", () => {
    const r = drawSecretSanta(["a", "b"]);
    expect(r.ok && r.pairs.map((p) => `${p.giver}>${p.receiver}`).sort()).toEqual(["a>b", "b>a"]);
  });

  it.each([3, 5, 12, 51])("with %i people nobody draws themselves and everyone gives and receives once", (n) => {
    const ids = Array.from({ length: n }, (_, i) => `g${i}`);
    for (let seed = 1; seed <= 20; seed++) {
      const r = drawSecretSanta(ids, seededRandom(seed));
      if (!r.ok) throw new Error(r.reason);
      expect(r.pairs).toHaveLength(n);
      expect(r.pairs.every((p) => p.giver !== p.receiver)).toBe(true);
      expect(new Set(r.pairs.map((p) => p.giver)).size).toBe(n);
      expect(new Set(r.pairs.map((p) => p.receiver)).size).toBe(n);
    }
  });
});
