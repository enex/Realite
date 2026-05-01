import { describe, expect, test } from "bun:test";

import { parseRealiteAdminEmailList } from "@/src/lib/admin-auth";

describe("parseRealiteAdminEmailList", () => {
  test("splits on comma, semicolon, newline and lowercases", () => {
    expect(parseRealiteAdminEmailList("A@X.com; b@y.org \nC@Z.IO").sort()).toEqual(
      ["a@x.com", "b@y.org", "c@z.io"].sort(),
    );
  });

  test("drops invalid tokens", () => {
    expect(parseRealiteAdminEmailList("ok@a.de, no-at, x@y.zz")).toEqual(["ok@a.de", "x@y.zz"]);
  });
});
