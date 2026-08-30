# Woodgrove IRM

Capital Markets Institutional Relationship Management demo — an agentic AI platform for institutional relationship managers, built on Azure AI Foundry.

---

## Architecture

```
+-----------------------------------------------------------------------+
|  Next.js Frontend  :3847                                              |
|  IRM workspace view + Client portal view                              |
+-------------------------------+---------------------------------------+
                                | /api/*  (HTTPS + SSE)
+-------------------------------v---------------------------------------+
|  FastAPI Backend (BFF)  :8172                                         |
|  session/thread state - persona routing - SSE relay                   |
+-------------------------------+---------------------------------------+
                                |
+-------------------------------v---------------------------------------+
|  Azure AI Foundry Agent (GPT-4.1)                                     |
+--------+-----------+-----------+-----------+---------------------------+
         |           |           |           |
         v           v           v           v
   Azure AI Search  Morningstar  Bing      Work IQ
   (RAG, x2 indexes)    MCP     Search   (M365 context)
```

---

## Modules

| Module | Key Capability |
|---|---|
| **Market Intelligence & Alerts** | Simulates real-time market monitoring and shock alerts (rates, credit spreads, commodities, cited to LSEG) that a production build would stream from a live market-data feed with threshold-based alerting |
| **Book of Business Overview** | Simulates portfolio-wide AUM and relationship-tier rollups, account browsing, and renewal reminders that a production build would compute from the CRM and Portfolio/OMS systems of record |
| **Triage** | Simulates AI-ranked account triage — surfacing which accounts are most exposed to today's market event, ordered by severity — representing how the app would prioritize an RM's attention in production |
| **Account Detail & Posture** | Simulates per-account allocation, posture indicators, and mandate-sensitivity detail that a production build would compute from live Portfolio/OMS and IC Research data |
| **Outreach Approval** | Simulates an agent-generated outreach recommendation (channel, contact, timing) that the RM must approve or adjust before any contact happens — human-in-the-loop by design, recurring across Triage, a dedicated Outreach Orchestration view, and Account Detail |
| **Advisor AI Chat** | Persistent chat side panel, live-connected to a Foundry-hosted agent (GPT-4.1) via the Responses API — grounded in the Azure AI Search knowledge sources, with citation-backed answers. Available throughout the app, with contextual "Live Call Assist" during a simulated call |
| **Client Call Simulation** | Simulates a live-call copilot experience — real-time talking points, data cards, and next-step suggestions alongside a compliance status as the conversation progresses |
| **Client Portal** | Simulates the client-facing counterpart's view of the relationship — what they'd see in production, without leaving the app |

---

## Agent

**Advisor AI Chat** is the one real, live agent in this app — not a simulation.

- **Model:** GPT-4.1
- **Knowledge sources:** two Azure AI Search indexes — one grounding market & portfolio data (accounts, holdings, market data, investment committee positioning), one grounding compliance policy (communications policy, credit authority policy)
- **Tools:** web search, Work IQ (Microsoft 365 context — target state, not currently attached), Morningstar MCP (fund/research data — proof of concept)
- **Behavior:** institutional tone, never fabricates figures, always cites sources, keeps market-data and compliance answers grounded in separate knowledge sources, and appends a standing "no action taken without your approval" note on compliance topics

Because compliance guidance is one of its two real knowledge sources, asking it a compliance question — what's allowed, what needs a disclosure, what needs escalation — gets a genuine, grounded, cited answer. That's a real capability, not part of what's simulated below.

### Simulated agentic process

Beyond the real agent, this demo also represents two further roles from the broader IRM reference architecture, entirely through static UI with no connection to the agent above:

- **Market & Client Monitoring** — detecting the day's market event and mapping its impact across the book (Market Intelligence & Alerts, the Impact Banner, Triage's severity ranking)
- **Client Services** — orchestrating outreach across each client's preferred channel and timing (Outreach Approval, Book of Business)

Both represent what dedicated agents in a production build would compute live — here, their output is pre-set content rather than something generated on demand.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 15, React 19, TypeScript, Tailwind CSS |
| Backend runtime | Python, FastAPI, uvicorn |
| Agent runtime / LLM API | Azure AI Foundry Agent Service — Responses API (`agent_reference`) |
| Vector / RAG | Azure AI Search — two indexes (market & portfolio, compliance) |
| Grounding tools | Bing Search, Morningstar MCP, Work IQ |
| Auth | Microsoft Entra ID (user sign-in), Azure managed identity (service-to-service) |
| Session / data storage | In-memory (session-to-thread mapping) and local JSON files today — not persistent across restarts or multiple replicas. A production build would need an external store (e.g., Cosmos DB) here |
| API surface | Single `/api/*` proxy path, frontend to backend. No public or documented endpoint list. |
| Deployment | Azure App Service (frontend), Azure Container Apps (backend), Azure Container Registry |
| CI/CD | GitHub Actions |

---

## Human-in-the-Loop Gates

- **Outreach Approval** — every proposed outreach action (channel, contact, timing) requires the RM to Approve or Adjust before it's treated as actioned. Appears in Triage, a dedicated Outreach Orchestration view, and Account Detail.
- **Compliance disclaimer** — the real agent appends "No action is taken without your approval" to every compliance-related response, by design.
- **Live agent responses during the call** — the suggested prompts shown during a simulated call are pre-written, but selecting one sends a real request to the agent over the same SSE streaming connection used elsewhere in the app; the response is genuinely agent-generated. In production, this could be a true real-time capability: Azure Communication Services' Call Automation supports live transcription during an active call, which can feed an LLM for real-time suggestions — but the AI/backend would have to be integrated into the call session to access that stream, not an outside listener.

---

## Project Structure

```
app/
  page.tsx                              # Scene/persona state machine
  layout.tsx                            # Root layout
  globals.css                           # Global styles
  api/advisor/chat/stream/route.ts      # Server-side proxy to the backend (same-origin SSE)

components/frontend/
  irm/
    IRMDashboard.tsx                    # Triage, Market Intelligence & Alerts, Book of Business Overview
    OrchestrationView.tsx               # Account Detail & Posture, Outreach Approval
    PhoneCallSimulator.tsx              # Client Call Simulation widget
  client/
    ClientDashboard.tsx                 # Client Portal
  advisor/
    AdvisorChatView.tsx                 # Advisor AI Chat — the real agent-connected panel
  shared/
    SageChatPane.tsx                    # Floating chat button
    VegaChart.tsx                       # Renders the agent's chart responses

lib/
  irmData.ts                            # IRM demo data (accounts, market event, call segments)
  irmTypes.ts                           # Scene and data type definitions
  advisorApi.ts                         # Real backend calls for the chat panel

backend/
  main.py                               # FastAPI entry point, Foundry agent connection
  advisor_routes.py                     # The real endpoints the chat panel calls
  advisor_storage.py                    # Data layer behind those endpoints
  data/                                 # JSON seed data (advisors, escalations, appointments, regulatory rules)
  pyproject.toml                        # Python dependencies

Dockerfile, backend/Dockerfile, docker-compose.yml, next.config.mjs, package.json
```
