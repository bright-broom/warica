import { serializeState, STORAGE_KEY } from '../../src/lib/storage';
import { emptyState } from '../../src/lib/types';

// Existing-event regressions deliberately use saved empty data. Initial-use tests use no fixture.
export const savedEmptyEvent = {
  cookies: [],
  origins: [
    {
      origin: new URL(process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:3100').origin,
      localStorage: [{ name: STORAGE_KEY, value: serializeState(emptyState()) }],
    },
  ],
};
