import { authRouter } from "./auth";
import { locationRouter } from "./location";
import { userRouter } from "./user";

export const router = {
  auth: authRouter,
  location: locationRouter,
  user: userRouter,
};

export type Router = typeof router;
