// tests/simpleQueue.test.ts
import { SimpleQueue } from '../src/core/SimpleQueue';

describe('SimpleQueue', () => {
  test('enqueue and dequeue maintain FIFO order', () => {
    const q = new SimpleQueue<number>();
    q.enqueue(1);
    q.enqueue(2);
    q.enqueue(3);

    expect(q.dequeue()).toBe(1);
    expect(q.dequeue()).toBe(2);
    q.enqueue(4);
    expect(q.dequeue()).toBe(3);
    expect(q.dequeue()).toBe(4);
    expect(q.dequeue()).toBeUndefined();
  });

  test('size and isEmpty work', () => {
    const q = new SimpleQueue<string>();
    expect(q.isEmpty()).toBe(true);
    q.enqueue('a');
    expect(q.size()).toBe(1);
    expect(q.isEmpty()).toBe(false);
    q.dequeue();
    expect(q.isEmpty()).toBe(true);
  });
});
