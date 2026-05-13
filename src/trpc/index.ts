import { analyticsRouter } from "./routers/analytics"
import { contentRouter } from "./routers/content"
import { coupleRouter } from "./routers/couple"
import { invitationRouter } from "./routers/invitation"
import { profileRouter } from "./routers/profile"
import { userRouter } from "./routers/user"
import { createTrpcContext, t } from "./trpc"

export const appRouter = t.router({
  user: userRouter,
  profile: profileRouter,
  invitation: invitationRouter,
  couple: coupleRouter,
  content: contentRouter,
  analytics: analyticsRouter,
})

export type AppRouter = typeof appRouter

export { createTrpcContext }
