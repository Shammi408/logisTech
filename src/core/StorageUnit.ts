export abstract class StorageUnit {
    public capacity: number;
    public used: number;

    constructor(capacity: number){
        this.capacity = capacity;
        this.used = 0;
    }

    abstract occupy_space(amount: number): boolean;
    abstract free_space(amount: number): void;
    
    getFreeSpace(): number {
        return this.capacity - this.used;
    }
} 