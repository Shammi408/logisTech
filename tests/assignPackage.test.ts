
import db from '../src/db/db';
import { LogiMaster } from '../src/core/LogiMaster';
import { StorageBin } from '../src/core/StorageBin';
import { Package } from '../src/core/Package';

// Mock the db.getClient to return a fake client with query/commit/rollback
jest.mock('../src/db/db');

describe('assignPackageToBin (DB transaction)', () => {
    beforeEach(() => {
        jest.resetAllMocks();
    });

    test('commits and returns true on success', async () => {
        const fakeClient = {
        query: jest.fn()
            // first call: UPDATE -> simulate rowCount = 1
            .mockResolvedValueOnce({ rowCount: 1 })
            // second call: INSERT -> resolved
            .mockResolvedValueOnce({}),
        release: jest.fn()
        };

        // @ts-ignore - mock implementation
        db.getClient.mockResolvedValue(fakeClient);

        const lm = LogiMaster.getInstance();
        const bin = new StorageBin(100, 1);
        lm.loadBinInventory([bin]);

        const pkg = new Package('T1', 20, 'X');

        const ok = await lm.assignPackageToBin(pkg);
        expect(ok).toBe(true);
        expect(fakeClient.query).toHaveBeenCalled();
        expect(bin.getFreeSpace()).toBe(80); // used = 20
    });

    test('rolls back and frees in-memory on DB failure', async () => {
        const fakeClient = {
        query: jest.fn()
            // first call: UPDATE -> throws
            .mockRejectedValueOnce(new Error('db error')),
        release: jest.fn()
        };

        // @ts-ignore
        db.getClient.mockResolvedValue(fakeClient);

        const lm = LogiMaster.getInstance();
        const bin = new StorageBin(100, 2);
        lm.loadBinInventory([bin]);

        const pkg = new Package('T2', 30, 'Y');

        const ok = await lm.assignPackageToBin(pkg);
        expect(ok).toBe(false);
        // ensure in-memory freed
        expect(bin.getFreeSpace()).toBe(100);
    });
});
