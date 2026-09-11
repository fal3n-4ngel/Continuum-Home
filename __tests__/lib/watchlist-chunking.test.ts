import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  WATCHLIST_CHUNK_LIMIT,
  DEFAULT_CHUNK_ID,
  getRawWatchlist,
  writeWatchlistItems,
} from "@/lib/firebase/repositories/watchlist.repo";
import { Session } from "@/lib/auth";

const mockFsFetch = vi.fn();
const mockListSubcollectionDocs = vi.fn();

vi.mock("@/lib/firebase/client", async () => {
  const actual = await vi.importActual<Record<string, unknown>>("@/lib/firebase/client");
  return {
    ...actual,
    fsFetch: (...args: unknown[]) => mockFsFetch(...args),
    listSubcollectionDocs: (...args: unknown[]) => mockListSubcollectionDocs(...args),
  };
});

vi.mock("@/lib/utils", async () => {
  const actual = await vi.importActual<Record<string, unknown>>("@/lib/utils");
  return {
    ...actual,
    cacheGet: vi.fn().mockResolvedValue(null),
    cacheSet: vi.fn().mockResolvedValue(undefined),
    cacheInvalidate: vi.fn().mockResolvedValue(undefined),
  };
});

describe("Watchlist Auto-Chunking Engine", () => {
  const mockSession: Session = {
    uid: "test-user-123",
    user: { uid: "test-user-123", email: "test@continuum.local", displayName: null },
    idToken: "mock-id-token",
    config: { projectId: "test-project", apiKey: "test-key" },
    creds: {} as unknown as Session["creds"],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("defines chunk size limit as 1500 and default chunk as default", () => {
    expect(WATCHLIST_CHUNK_LIMIT).toBe(1500);
    expect(DEFAULT_CHUNK_ID).toBe("default");
  });

  it("fetches and merges multiple chunks into getRawWatchlist", async () => {
    mockListSubcollectionDocs.mockResolvedValue([
      {
        id: "default",
        data: {
          items: {
            item1: { title: "Inception", type: "movie", status: "completed", progress: 1 },
          },
        },
      },
      {
        id: "chunk_1",
        data: {
          items: {
            item2: { title: "Interstellar", type: "movie", status: "watching", progress: 0 },
          },
        },
      },
    ]);

    const result = await getRawWatchlist(mockSession);
    expect(Object.keys(result)).toEqual(["item1", "item2"]);
    expect(result.item1.title).toBe("Inception");
    expect(result.item2.title).toBe("Interstellar");
  });

  it("writes new items to default chunk when default is under 1500 items", async () => {
    mockListSubcollectionDocs.mockResolvedValue([
      {
        id: "default",
        data: {
          items: {
            existing1: { title: "Existing", type: "movie" },
          },
        },
      },
    ]);
    mockFsFetch.mockResolvedValue({ writeResults: [] });

    await writeWatchlistItems(
      mockSession,
      {
        newItem1: { title: "New Film", type: "movie" },
      },
      new Set(["newItem1"])
    );

    expect(mockFsFetch).toHaveBeenCalledTimes(1);
    const commitPayload = JSON.parse(mockFsFetch.mock.calls[0][2].body);
    const updateNames = commitPayload.writes.map((w: { update: { name: string } }) => w.update.name);
    expect(updateNames).toContain("projects/test-project/databases/(default)/documents/users/test-user-123/watchlists/default");
    expect(updateNames).toContain("projects/test-project/databases/(default)/documents/watchlists/test-user-123");
  });

  it("spills new items to chunk_1 when default chunk hits 1500 items", async () => {
    const fullDefaultItems: Record<string, { title: string }> = {};
    for (let i = 0; i < 1500; i++) {
      fullDefaultItems[`item_${i}`] = { title: `Movie ${i}` };
    }

    mockListSubcollectionDocs.mockResolvedValue([
      {
        id: "default",
        data: { items: fullDefaultItems },
      },
    ]);
    mockFsFetch.mockResolvedValue({ writeResults: [] });

    await writeWatchlistItems(
      mockSession,
      {
        spillItem: { title: "Spillover Film", type: "movie" },
      },
      new Set(["spillItem"])
    );

    expect(mockFsFetch).toHaveBeenCalledTimes(1);
    const commitPayload = JSON.parse(mockFsFetch.mock.calls[0][2].body);
    const chunk1Write = commitPayload.writes.find((w: { update: { name: string } }) =>
      w.update.name.endsWith("watchlists/chunk_1")
    );
    expect(chunk1Write).toBeDefined();
    expect(chunk1Write.updateMask.fieldPaths).toContain("items.`spillItem`");
  });

  it("routes update patches and deletions to the chunk where the item already resides", async () => {
    mockListSubcollectionDocs.mockResolvedValue([
      {
        id: "default",
        data: {
          items: { itemInDefault: { title: "Default Movie" } },
        },
      },
      {
        id: "chunk_1",
        data: {
          items: { itemInChunk1: { title: "Chunk1 Movie", progress: 0 } },
        },
      },
    ]);
    mockFsFetch.mockResolvedValue({ writeResults: [] });

    await writeWatchlistItems(mockSession, {
      itemInChunk1: { progress: 5 },
    });

    expect(mockFsFetch).toHaveBeenCalledTimes(1);
    const commitPayload = JSON.parse(mockFsFetch.mock.calls[0][2].body);
    const chunk1Write = commitPayload.writes.find((w: { update: { name: string } }) =>
      w.update.name.endsWith("watchlists/chunk_1")
    );
    expect(chunk1Write).toBeDefined();
    expect(chunk1Write.updateMask.fieldPaths).toContain("items.`itemInChunk1`.progress");

    const defaultWrite = commitPayload.writes.find((w: { update: { name: string } }) =>
      w.update.name.endsWith("watchlists/default")
    );
    expect(defaultWrite).toBeUndefined();
  });
});
