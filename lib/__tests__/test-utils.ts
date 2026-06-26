import { vi } from "vitest";

// ─── Shared Prisma mock factory ────────────────────────────

type DeepPartial<T> = T extends object
  ? { [P in keyof T]?: DeepPartial<T[P]> }
  : T;

type MockHandler = (...args: any[]) => any;

type PrismaModelMethods = "findUnique" | "findMany" | "findFirst" | "create" | "update" | "upsert" | "delete" | "count" | "groupBy" | "aggregate";

type PrismaModel = Record<PrismaModelMethods, MockHandler> & {
  _count?: Record<string, MockHandler>;
};

export function createPrismaMock(models: string[] = []): Record<string, PrismaModel> {
  const mock: Record<string, PrismaModel> = {};
  for (const model of models) {
    const m = {} as PrismaModel;
    const methods: PrismaModelMethods[] = ["findUnique", "findMany", "findFirst", "create", "update", "upsert", "delete", "count", "groupBy", "aggregate"];
    for (const method of methods) {
      m[method] = vi.fn();
    }
    mock[model] = m;
  }
  return mock;
}

export function createDbMock(models: string[]) {
  const mocks = createPrismaMock(models);
  return {
    mocks,
    mockModule: {
      prisma: mocks,
      isDbConnectionError: vi.fn((e: unknown) => false),
      isPrismaError: vi.fn((e: unknown) => e instanceof Error && "clientVersion" in e),
      isDbError: vi.fn((e: unknown) => e instanceof Error && "clientVersion" in e),
    },
  };
}

export function mockEnv(key: string, value: string) {
  const original = process.env[key];
  beforeAll(() => { process.env[key] = value; });
  afterAll(() => {
    if (original === undefined) delete process.env[key];
    else process.env[key] = original;
  });
}

// ─── Request helpers for API route tests ───────────────────

export function createRequest(method: string, url: string, init?: RequestInit & { headers?: Record<string, string> }): Request {
  return new Request(url, { method, ...init });
}

export function createJsonRequest(method: string, url: string, body: unknown, headers?: Record<string, string>): Request {
  return new Request(url, {
    method,
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}

export function createFormDataRequest(method: string, url: string, formData: FormData, headers?: Record<string, string>): Request {
  return new Request(url, {
    method,
    headers,
    body: formData,
  });
}
