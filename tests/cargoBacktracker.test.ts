import { Package } from "../src/core/Package"
import { canPackExact, bestFitSubset } from "../src/algorithms/cargoBacktracker"

describe("cargoBacktracker - canPackExact", () =>{
    test("Exact match acroos multiple packages", ()=>{
        const pkgs = [
            new Package ("a", 3, ""),
            new Package ("b", 4, ""),
            new Package ("c", 5, ""),
            new Package ("d", 7, "")
        ]
        expect(canPackExact(pkgs, 14)).toBe(true); //3+7+4
        expect(canPackExact(pkgs, 19)).toBe(true); // all fit
        expect(canPackExact(pkgs, 1)).toBe(false);
        expect(canPackExact(pkgs, 13)).toBe(false); //no exact match
    });

    test("fails when total less than capacity", () =>{
        const pkgs = [
            new Package("x", 2, ""),
            new Package("y", 3, "")
        ]
        expect(canPackExact(pkgs,10)).toBe(false);
    });
});

describe("cargoBacktracker - bestFitSubset", () => {
    test("returns best-fit subset under capacity", () => {
        const pkgs = [
            new Package("p1", 20, ""),
            new Package("p2", 10, ""),
            new Package("p3", 5, ""),
            new Package("p4", 30, ""),
            new Package("p5", 25, "")
        ];
        const result = bestFitSubset(pkgs, 50); // best is 30+20 = 50 or 25+20+5 = 50
        const total = result.reduce((s, p) => s + p.size, 0);
        expect(total).toBe(50);
    });

    test("works when no package fits individually", () => {
        const pkgs = [
            new Package("a", 100, ""), 
            new Package("b", 120, "")
        ];
        expect(bestFitSubset(pkgs, 50).length).toBe(0);
    });

    test("returns something reasonable when exact capacity isn't possible", () => {
        const pkgs = [
            new Package("a", 7, ""), 
            new Package("b", 5, ""), 
            new Package("c", 3, "")
        ];
        const r = bestFitSubset(pkgs, 10); // best is 7+3 = 10 or 5+3 = 8 (7+3 exists)
        const total = r.reduce((s, p) => s + p.size, 0);
        expect(total).toBeGreaterThan(0);
        expect(total).toBeLessThanOrEqual(10);
    });
});
