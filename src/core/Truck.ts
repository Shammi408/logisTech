import { StorageUnit } from "./StorageUnit";
import { Package } from "./Package";

export class Truck extends StorageUnit {
    public truckId : string;
    private stack : Package[] = [];

    constructor(truckId : string, capacity: number){
        super(capacity);
        this.truckId = truckId;
    }

    occupy_space(amount: number): boolean {
        if (amount <= 0) return false; 
        if ( amount <= this.getFreeSpace()){
            this.used += amount;
            return true;
        }
        return false;
    }

    free_space(amount: number): void {
        this.used = Math.max(0, this.used -amount);
    }

    pushPackage(pkg: Package): boolean{
        if(this.occupy_space(pkg.size)){
            this.stack.push(pkg);
            return true;
        }
        return false;
    }

    popPackage(): Package | undefined {
        const p = this.stack.pop();
        if(p) this.free_space(p.size);
        return p;
    }

    rollbackLoad(targetTrackingId: string): boolean {
        const temp: Package[] = [];
        while(this.stack.length){
            const p = this.popPackage()!;
            if(p.trackingId === targetTrackingId){
                while(temp.length){ this.pushPackage(temp.pop()!); }
                return true;
            }else{
                temp.push(p);
            }
        }
        //not found restore everything
        while(temp.length) this.pushPackage(temp.pop()!);
        return this.popUntil(targetTrackingId) !== null;
    }
    
    /**
     * Pop packages until the package with targetTrackingId is removed.
     * Returns the removed package or null if not found. Maintains order for remaining packages.
     */
    public popUntil(targetTrackingId: string): Package | null {
        const temp: Package[] = [];
        let found: Package | null = null;

        while (this.stack.length) {
            const p = this.popPackage()!;
            if (p.trackingId === targetTrackingId) {
            found = p;
            break;
            } else {
            temp.push(p);
            }
        }

        // push back the other popped packages in original order
        while (temp.length) {
            this.pushPackage(temp.pop()!);
        }

        return found;
    }

    /** Optional: setUsed (for startup reconciliation) */
    public setUsed(value: number) {
        if (value < 0) value = 0;
        if (value > this.capacity) value = this.capacity;
        (this as any).used = value;
    }
    public getUsed(): number {
        return this.used;
    }

    // expose stack summary (read-only) 
    public getStackSummary() { 
        return this.stack.map(p => ({
            trackingId: p.trackingId,
            size: p.size
        }));
    }
}