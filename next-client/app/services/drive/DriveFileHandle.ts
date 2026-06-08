import * as client from './client';

class DriveWritableStream {
  private buffer = '';

  constructor(
    private readonly fileId: string,
    private readonly onClose: (content: string) => Promise<void>,
  ) {}

  async write(data: string | BufferSource | Blob): Promise<void> {
    if (typeof data === 'string') {
      this.buffer = data;
    } else if (data instanceof Blob) {
      this.buffer = await data.text();
    }
  }

  async close(): Promise<void> {
    await this.onClose(this.buffer);
  }

  abort(): void {}
}

// Duck-types FileSystemFileHandle so existing call sites (openFile, saveFile, metadata)
// can work with Drive files without modification.
export class DriveFileHandle {
  readonly kind = 'file' as const;

  constructor(
    public readonly name: string,
    public readonly fileId: string,
  ) {}

  async getFile(): Promise<{ text(): Promise<string>; lastModified: number; name: string; size: number }> {
    const driveFile = await client.getFile(this.fileId);
    const modifiedAt = new Date(driveFile.modifiedTime).getTime();
    return {
      text: () => client.getFileContent(this.fileId),
      lastModified: modifiedAt,
      name: this.name,
      size: parseInt(driveFile.size || '0', 10),
    };
  }

  async createWritable(): Promise<DriveWritableStream> {
    return new DriveWritableStream(this.fileId, (content) =>
      client.updateFile(this.fileId, content).then(() => undefined),
    );
  }

  // Android permission API stubs — always granted for Drive
  async queryPermission(): Promise<PermissionState> {
    return 'granted';
  }

  async requestPermission(): Promise<PermissionState> {
    return 'granted';
  }

  async isSameEntry(other: unknown): Promise<boolean> {
    return other instanceof DriveFileHandle && other.fileId === this.fileId;
  }
}
