// In-memory stand-ins for FileSystemDirectoryHandle / FileSystemFileHandle,
// for tests only. jsdom has neither the File System API nor Blob.arrayBuffer(),
// so files are duck-typed objects exposing arrayBuffer() and text().

type Content = string | Uint8Array | ArrayBuffer | { arrayBuffer(): Promise<ArrayBuffer> };

function domError(name: string): DOMException {
  return new DOMException(name, name);
}

async function toBytes(content: Content): Promise<Uint8Array> {
  if (typeof content === "string") return new TextEncoder().encode(content);
  // Tag checks, not instanceof: jsdom and Node have separate realms, so an
  // ArrayBuffer from TextEncoder fails `instanceof ArrayBuffer` under jsdom.
  if (ArrayBuffer.isView(content)) return new Uint8Array(content.buffer.slice(content.byteOffset, content.byteOffset + content.byteLength));
  if (Object.prototype.toString.call(content) === "[object ArrayBuffer]") return new Uint8Array((content as ArrayBuffer).slice(0));
  return new Uint8Array(await (content as { arrayBuffer(): Promise<ArrayBuffer> }).arrayBuffer());
}

export function fakeFile(name: string, content: string | Uint8Array, webkitRelativePath = ""): File {
  const bytes = typeof content === "string" ? new TextEncoder().encode(content) : content;
  return {
    name,
    webkitRelativePath,
    size: bytes.byteLength,
    lastModified: 0,
    arrayBuffer: async () => bytes.slice().buffer,
    text: async () => new TextDecoder().decode(bytes),
  } as unknown as File;
}

export class MemoryFileHandle {
  readonly kind = "file";
  constructor(public name: string, public bytes: Uint8Array = new Uint8Array()) {}

  async getFile() {
    return fakeFile(this.name, this.bytes);
  }

  async createWritable() {
    const chunks: Uint8Array[] = [];
    return {
      write: async (content: Content) => { chunks.push(await toBytes(content)); },
      close: async () => {
        const size = chunks.reduce((total, chunk) => total + chunk.byteLength, 0);
        const next = new Uint8Array(size);
        let offset = 0;
        for (const chunk of chunks) {
          next.set(chunk, offset);
          offset += chunk.byteLength;
        }
        this.bytes = next;
      },
    };
  }

  text(): string {
    return new TextDecoder().decode(this.bytes);
  }
}

export class MemoryDirectoryHandle {
  readonly kind = "directory";
  readonly children = new Map<string, MemoryDirectoryHandle | MemoryFileHandle>();
  constructor(public name: string) {}

  async getDirectoryHandle(name: string, options?: { create?: boolean }): Promise<MemoryDirectoryHandle> {
    const existing = this.children.get(name);
    if (existing) {
      if (existing.kind !== "directory") throw domError("TypeMismatchError");
      return existing;
    }
    if (!options?.create) throw domError("NotFoundError");
    const directory = new MemoryDirectoryHandle(name);
    this.children.set(name, directory);
    return directory;
  }

  async getFileHandle(name: string, options?: { create?: boolean }): Promise<MemoryFileHandle> {
    const existing = this.children.get(name);
    if (existing) {
      if (existing.kind !== "file") throw domError("TypeMismatchError");
      return existing;
    }
    if (!options?.create) throw domError("NotFoundError");
    const file = new MemoryFileHandle(name);
    this.children.set(name, file);
    return file;
  }

  async removeEntry(name: string): Promise<void> {
    if (!this.children.delete(name)) throw domError("NotFoundError");
  }

  async *values() {
    yield* this.children.values();
  }

  // Test helpers (not part of the File System API).
  async writeText(path: string, text: string): Promise<MemoryFileHandle> {
    const slash = path.indexOf("/");
    if (slash !== -1) {
      const directory = await this.getDirectoryHandle(path.slice(0, slash), { create: true });
      return directory.writeText(path.slice(slash + 1), text);
    }
    const file = await this.getFileHandle(path, { create: true });
    file.bytes = new TextEncoder().encode(text);
    return file;
  }

  listPaths(prefix = ""): string[] {
    const paths: string[] = [];
    for (const entry of this.children.values()) {
      const path = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.kind === "directory") paths.push(...entry.listPaths(path));
      else paths.push(path);
    }
    return paths.sort();
  }

  fileAt(path: string): MemoryFileHandle | undefined {
    const slash = path.indexOf("/");
    if (slash !== -1) {
      const child = this.children.get(path.slice(0, slash));
      return child?.kind === "directory" ? child.fileAt(path.slice(slash + 1)) : undefined;
    }
    const entry = this.children.get(path);
    return entry?.kind === "file" ? entry : undefined;
  }

  asHandle(): FileSystemDirectoryHandle {
    return this as unknown as FileSystemDirectoryHandle;
  }
}
