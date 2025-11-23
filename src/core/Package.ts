export class Package {
    public trackingId: string;
    public size: number;
    public destination: string;

    constructor(trackingId: string, size: number, destination: string) {
        this.trackingId = trackingId;
        this.size = size;
        this.destination = destination;
    }
}