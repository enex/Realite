import { appConfigRouter } from "./appConfig";
import { authRouter } from "./auth";
import { locationRouter } from "./location";
import { planRouter } from "./plan";
import { shareRouter } from "./share";
import { userRouter } from "./user";

export const router = {
  auth: authRouter,
  location: locationRouter,
  plan: planRouter,
  user: userRouter,
  share: shareRouter,
  appConfig: appConfigRouter,
};

export type Router = typeof router;
