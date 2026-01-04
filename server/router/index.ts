import { appConfigRouter } from "./app-config";
import { authRouter } from "./auth";
import { contactRouter } from "./contact";
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
  contact: contactRouter,
};

export type Router = typeof router;
