import { describe, expect, it } from "vitest";
import {
  mapCoverstock,
  mapCoreType,
  toCatalogBall,
  searchCatalog,
  type BowwwlBall,
} from "./catalog";

const portal: BowwwlBall = {
  ball_id: "20001",
  ball_name: "Portal",
  brand_name: "900 Global",
  release_date: "2025-03-12",
  core_rg: "2.590",
  core_diff: "0.050",
  core_int_diff: "0.017",
  core_type: "Asymmetric",
  core_name: "Portal Core",
  coverstock_type: "Pearl Reactive",
  coverstock_name: "S84 Response Pearl",
  factory_finish: "Reacta Gloss",
  ball_image:
    "/sites/default/files/styles/ball_image_main/public/balls/portal.png?itok=abc",
  thumbnail_image:
    "/sites/default/files/styles/medium/public/balls/portal.png?itok=def",
  availability: "Available",
};

describe("mapCoverstock", () => {
  it("buckets bowwwl cover types into our five", () => {
    expect(mapCoverstock("Pearl Reactive")).toBe("pearl");
    expect(mapCoverstock("Solid Reactive")).toBe("solid");
    expect(mapCoverstock("Hybrid Reactive")).toBe("hybrid");
    expect(mapCoverstock("Particle Reactive")).toBe("solid");
    expect(mapCoverstock("Particle/Pearl Reactive")).toBe("pearl");
    expect(mapCoverstock("Urethane Solid")).toBe("urethane");
    expect(mapCoverstock("Urethane Pearl")).toBe("urethane");
    expect(mapCoverstock("Microcell Polymer")).toBe("urethane");
    expect(mapCoverstock("Polyester")).toBe("plastic");
    expect(mapCoverstock("")).toBeNull();
    expect(mapCoverstock("Mystery Cover")).toBeNull();
  });
});

describe("mapCoreType", () => {
  it("lowercases known types and drops the rest", () => {
    expect(mapCoreType("Asymmetric")).toBe("asymmetric");
    expect(mapCoreType("Symmetric")).toBe("symmetric");
    expect(mapCoreType("")).toBeNull();
  });
});

describe("toCatalogBall", () => {
  it("converts a bowwwl record to our shape", () => {
    const ball = toCatalogBall(portal);
    expect(ball).toMatchObject({
      id: "20001",
      name: "Portal",
      brand: "900 Global",
      year: "2025",
      rg: 2.59,
      differential: 0.05,
      intermediateDiff: 0.017,
      coverstock: "pearl",
      coreType: "asymmetric",
      discontinued: false,
    });
    expect(ball.imageUrl).toBe(
      "https://www.bowwwl.com/sites/default/files/styles/ball_image_main/public/balls/portal.png?itok=abc",
    );
  });

  it("leaves blank numbers and images null", () => {
    const ball = toCatalogBall({
      ...portal,
      core_int_diff: "",
      ball_image: "",
      thumbnail_image: "",
      core_type: "Symmetric",
    });
    expect(ball.intermediateDiff).toBeNull();
    expect(ball.imageUrl).toBeNull();
    expect(ball.thumbUrl).toBeNull();
  });
});

describe("searchCatalog", () => {
  const balls = [
    toCatalogBall(portal),
    toCatalogBall({
      ...portal,
      ball_id: "2",
      ball_name: "Phaze II",
      brand_name: "Storm",
    }),
    toCatalogBall({
      ...portal,
      ball_id: "3",
      ball_name: "Phaze 4",
      brand_name: "Storm",
    }),
  ];

  it("matches name and brand, case-insensitive", () => {
    expect(searchCatalog(balls, "por").map((b) => b.id)).toEqual(["20001"]);
    expect(searchCatalog(balls, "storm phaze").map((b) => b.id)).toEqual([
      "2",
      "3",
    ]);
    expect(searchCatalog(balls, "900 global")).toHaveLength(1);
  });

  it("returns nothing for an empty query and respects the limit", () => {
    expect(searchCatalog(balls, "  ")).toEqual([]);
    expect(searchCatalog(balls, "phaze", 1)).toHaveLength(1);
  });
});
