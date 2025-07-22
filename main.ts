import { Hono } from "hono"
import { Axios } from "axios"
import { encodeBase64 } from "jsr:@std/encoding/base64"

const forwardUrl = Deno.env.get("FORWARD_URL")
const appUrl = Deno.env.get("APP_URL")
const appPort = Deno.env.get("APP_PORT")

const app = new Hono()
const httpClient = new Axios({
  baseURL: appUrl,
  headers: {
    "Content-Type": "application/json",
  },
})

app.get("/", (c) => c.text("Hello Deno!"))

app.post("/webhooks", async (c) => {
  // Extract buffer and stringify the hex value for debugging
  const buffer = await c.req.arrayBuffer()
  const bufferToLog = new Uint8Array(buffer)

  const loggedBufferAsString = encodeBase64(bufferToLog)

  console.log("Received webhook buffer:", loggedBufferAsString)

  if (forwardUrl) {
    try {
      // Forward the request to the specified URL
      await httpClient.post(forwardUrl, {
        initialRequest: c.req.json(),
        buffer,
      })
      console.log("Webhook forwarded successfully")
    } catch (error) {
      console.error("Error forwarding webhook:", error)
      return c.json({ error: "Failed to forward webhook" }, 500)
    }
  }

  return c.json(
    {
      message: "Webhook received",
      bufferEncoded: loggedBufferAsString,
      buffer: bufferToLog,
    },
    200
  )
})

Deno.serve(
  {
    port: Number(appPort) || 4400,
  },
  app.fetch
)
