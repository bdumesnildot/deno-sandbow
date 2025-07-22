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
  // --- 1. Read the request body ONCE as a buffer ---
  // This buffer is now our single source of truth for the request body.
  const buffer = await c.req.arrayBuffer()
  const bufferView = new Uint8Array(buffer)

  // --- 2. Derive the JSON object from the buffer ---
  // We decode the buffer's bytes into a string, then parse that string.
  let reqJson
  try {
    const bodyAsString = new TextDecoder().decode(bufferView)
    reqJson = JSON.parse(bodyAsString)
  } catch (e) {
    console.error("Failed to parse request body as JSON:", e)
    // Decide how to handle non-JSON bodies.
    reqJson = { error: "The incoming request body was not valid JSON." }
  }

  // --- 3. Encode the buffer to a Base64 string for transport ---
  const bufferAsBase64 = encodeBase64(bufferView)

  // --- Logging for Debugging ---
  console.log("Received webhook JSON:", JSON.stringify(reqJson, null, 2))
  console.log("Received webhook buffer (as Base64):", bufferAsBase64)

  if (forwardUrl) {
    try {
      // --- 4. Construct a valid JSON payload ---
      // Both properties are now serializable (an object and a string).
      const payload = {
        initialRequest: reqJson,
        buffer: bufferAsBase64,
      }

      // --- 5. Forward the request ---
      // Axios will correctly stringify the `payload` object.
      await httpClient.post(forwardUrl, payload)
      console.log("Webhook forwarded successfully")
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

JSON.stringify({ hello: "world" }, null, 4)
