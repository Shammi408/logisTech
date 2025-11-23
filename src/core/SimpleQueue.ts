export class SimpleQueue<T> {
  private inbox: T[] = [];
  private outbox: T[] = [];

  enqueue(item: T) { this.inbox.push(item); }

  dequeue(): T | undefined {
    if (this.outbox.length === 0) {
      while (this.inbox.length) this.outbox.push(this.inbox.pop()!);
    }
    return this.outbox.pop();
  }

  size(): number { return this.inbox.length + this.outbox.length; }

  isEmpty(): boolean { return this.size() === 0; }
}
