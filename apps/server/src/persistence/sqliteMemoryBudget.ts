// Purpose: Sizes SQLite's page cache and mmap window to the host's physical memory.

const MIB = 1024 * 1024;
const GIB = 1024 * MIB;

export interface SqliteMemoryBudget {
  /** `PRAGMA cache_size` value: negative KiB, i.e. `-(bytes / 1024)`. */
  readonly cacheSizePragma: number;
  /** `PRAGMA mmap_size` value in bytes. */
  readonly mmapSizeBytes: number;
}

export function resolveSqliteMemoryBudget(totalMemoryBytes: number): SqliteMemoryBudget {
  const total = Number.isFinite(totalMemoryBytes) && totalMemoryBytes > 0 ? totalMemoryBytes : 0;
  if (total >= 24 * GIB) {
    return { cacheSizePragma: -(256 * MIB) / 1024, mmapSizeBytes: GIB };
  }
  if (total >= 12 * GIB) {
    return { cacheSizePragma: -(128 * MIB) / 1024, mmapSizeBytes: 512 * MIB };
  }
  return { cacheSizePragma: -(64 * MIB) / 1024, mmapSizeBytes: 256 * MIB };
}
