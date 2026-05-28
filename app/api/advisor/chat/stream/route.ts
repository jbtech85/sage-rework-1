import { NextRequest } from "next/server"

const API_URL = process.env.NEXT_PUBLIC_API_URL || ""
const TENANT_ID = process.env.AZURE_TENANT_ID || ""
const CLIENT_ID = process.env.AZURE_CLIENT_ID || ""
const CLIENT_SECRET = process.env.AZURE_CLIENT_SECRET || ""

// Delegated scope for Work IQ — audience is api://workiq.svc.cloud.microsoft
const WORK_IQ_SCOPE = "api://workiq.svc.cloud.microsoft/WorkIQAgent.Ask"

async function exchangeOBO(userToken: string): Promise<string | null> {
  if (!TENANT_ID || !CLIENT_ID || !CLIENT_SECRET) return null

  const params = new URLSearchParams({
    grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    assertion: userToken,
    scope: WORK_IQ_SCOPE,
    requested_token_use: "on_behalf_of",
  })

  const res = await fetch(
    `https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0/token`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    }
  )

  if (!res.ok) {
    console.error("OBO exchange failed:", res.status, await res.text())
    return null
  }

  const data = await res.json()
  return data.access_token ?? null
}

export async function POST(request: NextRequest) {
  const body = await request.text()

  // App Service EasyAuth injects this header after authenticating the user.
  // The token's aud is the app's own client ID, making it OBO-compatible.
  const userToken = request.headers.get("x-ms-token-aad-access-token")

  const forwardHeaders: Record<string, string> = {
    "Content-Type": "application/json",
  }

  if (userToken) {
    const workIQToken = await exchangeOBO(userToken)
    if (workIQToken) {
      // Pass the Work IQ-scoped token so the backend can authenticate MCP calls
      forwardHeaders["x-ms-token-aad-access-token"] = workIQToken
    } else {
      console.warn("OBO exchange returned no token — Work IQ will be skipped")
    }
  }

  const backendRes = await fetch(`${API_URL}/advisor/chat/stream`, {
    method: "POST",
    headers: forwardHeaders,
    body,
  })

  if (!backendRes.ok) {
    return new Response(
      JSON.stringify({ error: "Backend error", status: backendRes.status }),
      { status: backendRes.status, headers: { "Content-Type": "application/json" } }
    )
  }

  // Proxy the SSE stream back to the browser
  return new Response(backendRes.body, {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  })
}
