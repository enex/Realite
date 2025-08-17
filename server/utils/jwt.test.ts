import { expect, test } from "bun:test";
import { signJWT, verifyJWT } from "./jwt";

test("signJWT and verifyJWT", async () => {
  const payload = {
    id: "12be5941-d24d-49f1-8390-0fe42fb4ad69",
    phoneNumber: "1234567890",
  };
  const token = await signJWT(payload);
  const verified = await verifyJWT(token);
  expect(verified).toMatchObject(payload);
});
