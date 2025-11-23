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
                while(temp.length){
                    const pk = temp.pop()!;
                    this.pushPackage(pk);
                }
                return true;
            }else{
                temp.push(p);
            }
        }
        //not found restore everything
        while(temp.length) this.pushPackage(temp.pop()!);
        return false;
    }
}