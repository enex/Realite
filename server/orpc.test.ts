import { call } from "@orpc/server";
import { beforeEach, describe, expect, it } from "bun:test";
import { router } from "./router";

describe("orpc", () => {
  it("should be defined", () => {
    expect(router).toBeDefined();
  });

  it("auth.getSession returns null when no session", async () => {
    const result = await call(
      router.auth.getSession,
      {},
      {
        context: {
          headers: {},
          db: {} as any,
          session: undefined,
        },
      }
    );
    expect(result).toBeNull();
  });

  it("auth.getSession returns session when provided", async () => {
    const session = { id: "user-1", name: "Alice" } as any;
    const result = await call(
      router.auth.getSession,
      {},
      {
        context: { headers: {}, db: {} as any, session },
      }
    );
    expect(result).toEqual(session);
  });

  describe("location.search", () => {
    beforeEach(() => {
      // Mock fetch for Google Places Text Search
      (globalThis as any).fetch = async (url: RequestInfo | URL) => {
        const u = url.toString();
        if (u.includes("/textsearch/")) {
          return new Response(
            JSON.stringify({
              status: "OK",
              results: [
                {
                  place_id: "p1",
                  name: "Cafe Central",
                  formatted_address: "Main St 1",
                  geometry: { location: { lat: 1.23, lng: 4.56 } },
                  types: ["cafe"],
                },
              ],
            }),
            { status: 200 }
          );
        }
        // Default minimal ok
        return new Response(JSON.stringify({ status: "OK", results: [] }), {
          status: 200,
        });
      };
    });

    it("requires authentication (protected route)", async () => {
      await expect(
        call(
          router.location.search,
          { query: "coffee" },
          { context: { headers: {}, db: {} as any, session: undefined } }
        )
      ).rejects.toBeDefined();
    });

    it("returns transformed locations when authenticated", async () => {
      const result = await call(
        router.location.search,
        { query: "coffee", includePhotos: false },
        {
          context: { headers: {}, db: {} as any, session: { id: "u1" } },
        }
      );
      expect(result).toEqual({
        locations: [
          {
            id: "p1",
            name: "Cafe Central",
            address: "Main St 1",
            latitude: 1.23,
            longitude: 4.56,
            source: "google",
            photoUrl: undefined,
            metadata: {
              placeType: ["cafe"],
              lastUsed: expect.any(Date),
              usageCount: 1,
            },
          },
        ],
      });
    });
  });
});
