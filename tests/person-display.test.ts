import { describe, expect, test } from "bun:test";

import {
  PUBLIC_MEMBER_FALLBACK_LABEL,
  getPersonDisplayLabel,
} from "@/src/lib/person-display";

describe("person display", () => {
  test("prefers a provided name over email", () => {
    expect(
      getPersonDisplayLabel({
        name: "Alex",
        email: "alex@example.com",
      }),
    ).toBe("Alex");
  });

  test("falls back to email for authenticated surfaces", () => {
    expect(
      getPersonDisplayLabel({
        email: "alex@example.com",
      }),
    ).toBe("alex@example.com");
  });

  test("uses a neutral label on public surfaces when only an email exists", () => {
    expect(
      getPersonDisplayLabel({
        email: "alex@example.com",
        allowEmail: false,
      }),
    ).toBe(PUBLIC_MEMBER_FALLBACK_LABEL);
  });
});
