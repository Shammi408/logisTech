import { Truck } from "../src/core/Truck";
import { Package } from "../src/core/Package";

describe ('Truck push/pop and rollbackLoad', ()=>{
    test('pushPackage respects capacity and pop frees space', ()=>{
        const truck = new Truck('T1', 100);
        const p1 = new Package('t1',30,'A');
        const p2 = new Package('t2',40,'B');
        const p3 = new Package('t3',50,'C');

        expect(truck.pushPackage(p1)).toBe(true);
        expect(truck.pushPackage(p2)).toBe(true);
        expect(truck.pushPackage(p3)).toBe(false);

        const poped = truck.popPackage();
        expect(poped?.trackingId).toBe('t2');

        expect(truck.pushPackage(p3)).toBe(true);
    });

    test('rollbackLoad removes target and restores others', ()=>{
        const truck = new Truck('T2',200);
        const a = new Package('a', 10, '');
        const b = new Package('b', 20, '');
        const c = new Package('c', 30, '');
        const d = new Package('d', 40, '');

        expect(truck.pushPackage(a)).toBe(true);
        expect(truck.pushPackage(b)).toBe(true);
        expect(truck.pushPackage(c)).toBe(true);
        expect(truck.pushPackage(d)).toBe(true);

        const ok = truck.rollbackLoad('b');
        expect(ok).toBe(true);

        const top = truck.popPackage();
        expect(top?.trackingId).toBe('d');

        expect(truck.popPackage()?.trackingId).toBe('c');
        expect(truck.popPackage()?.trackingId).toBe('a');
    });
})