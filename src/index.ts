import { trpcServer } from "@hono/trpc-server"
import { Hono } from "hono"
import { cors } from "hono/cors"
import { appRouter, createTrpcContext } from "./trpc"

const app = new Hono()

app.use(
  "/*",
  cors({
    origin: ["http://localhost:3000"],
    allowMethods: ["POST", "GET", "OPTIONS", "PUT", "PATCH", "DELETE"],
    credentials: true,
  }),
)

app.get("/", (c) => {
  return c.text("Hello Hono!")
})

app.use("/api/*", (c, next) => {
  return trpcServer({
    endpoint: "/api",
    router: appRouter,
    createContext: (opts, hono) => createTrpcContext(opts, hono),
  })(c, next)
})

export default app
