import { StorageUnit } from "./StorageUnit";

export class StorageBin extends StorageUnit {
    public binId: number;
    public locationCode: string;

    constructor(capacity: number, binId: number, locationCode = '') {
        super(capacity);
        this.binId = binId;
        this.locationCode = locationCode;
    }

    occupy_space(amount: number): boolean {
        if (amount <= this.getFreeSpace()) {
            this.used += amount;
            return true;
        }
        return false;
    }

    free_space(amount: number): void {
        this.used = Math.max(0, this.used - amount);
    }

    /*
        Set initial 'used' value safely when loading from DB.
        This is ONLY for initialization, never for runtime updates.
    */
    setUsed(value: number) {
        if (value < 0) value = 0;
        if (value > this.capacity) value = this.capacity;
        this.used = value;
    }

    static compareByCapacity(a: StorageBin, b: StorageBin) {
        return a.capacity - b.capacity;
    }
}
