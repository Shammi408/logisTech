import { LogiMaster } from "../src/core/LogiMaster";
import { StorageBin } from "../src/core/StorageBin";

describe('LogiMaster.findBestFitBin', ()=> {
    test('finds the smallest bin >= size', () =>{
        const lm = LogiMaster.getInstance();
        const bins = [
            new StorageBin(5,1),
            new StorageBin(10,2),
            new StorageBin(15,3),
            new StorageBin(50,4)
        ];
        lm.loadBinInventory(bins);


        const b1 = lm.findBestFitBin(1);
        expect(b1).not.toBeNull();
        expect(b1!.capacity).toBe(5);

        const b10 = lm.findBestFitBin(10);
        expect(b10).not.toBeNull();
        expect(b10!.capacity).toBe(10);

        const b12 = lm.findBestFitBin(12);
        expect(b12).not.toBeNull();
        expect(b12!.capacity).toBe(15);

        const b100 = lm.findBestFitBin(100);
        expect(b100).toBeNull();
    });

    test('edge cases: exact fit and one-off', ()=>{
        const lm = LogiMaster.getInstance();
        const bins = [
        new StorageBin(8, 11),
        new StorageBin(16, 12),
        new StorageBin(32, 13)
        ];
        lm.loadBinInventory(bins);

        expect(lm.findBestFitBin(8)!.capacity).toBe(8);
        expect(lm.findBestFitBin(9)!.capacity).toBe(16);
    });
});