import { appConfigRouter } from "./appConfig";
import { authRouter } from "./auth";
import { locationRouter } from "./location";
import { userRouter } from "./user";

export const router = {
  auth: authRouter,
  location: locationRouter,
  user: userRouter,
  appConfig: appConfigRouter,
};

export type Router = typeof router;
