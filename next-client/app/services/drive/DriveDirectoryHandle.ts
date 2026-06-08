// Duck-types FileSystemDirectoryHandle so existing code that reads
// vaultHandle?.name or passes it to scan/navigate functions works unchanged.
export class DriveDirectoryHandle {
  readonly kind = 'directory' as const;

  constructor(
    public readonly name: string,
    public readonly folderId: string,
  ) {}

  async isSameEntry(other: unknown): Promise<boolean> {
    return other instanceof DriveDirectoryHandle && other.folderId === this.folderId;
  }

  // Stub so code paths that call vaultHandle.resolve() don't crash — Drive
  // hooks resolve paths via the path index, not via this method.
  async resolve(): Promise<null> {
    return null;
  }
}
