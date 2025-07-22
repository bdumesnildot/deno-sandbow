import { Hono } from "hono"
import { encodeBase64 } from "jsr:@std/encoding/base64"

const forwardUrl = Deno.env.get("FORWARD_URL")
const appPort = Deno.env.get("APP_PORT")

const app = new Hono()

app.get("/", (c) => c.text("Hello Deno!"))

app.post("/webhooks", async (c) => {
  // Extract buffer and stringify the hex value for debugging
  const buffer = await c.req.arrayBuffer()
  const reqJson = await c.req.json()
  const bufferToLog = new Uint8Array(buffer)

  const loggedBufferAsString = encodeBase64(bufferToLog)

  console.log("Received webhook JSON:", JSON.stringify(reqJson, null, 0))
  console.log("Received webhook headers:", c.req.header())
  console.log("Received webhook buffer:", loggedBufferAsString)

  if (forwardUrl) {
    try {
      const forwardedData = {
        initialRequest: {
          headers: c.req.header(),
          method: c.req.method,
          url: c.req.url,
          body: reqJson,
        },
        buffer,
        bufferAsString: loggedBufferAsString,
        bufferToLog: bufferToLog,
      }

      // Forward the request to the specified URL
      const resp = await fetch(forwardUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(forwardedData),
      })

      console.log("Webhook forwarded successfully", resp)
    } catch (error) {
      console.error("Error forwarding webhook:", error)
      return c.json({ error: "Failed to forward webhook" }, 500)
    }
  }

  return c.json(
    {
      message: "Webhook received",
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
