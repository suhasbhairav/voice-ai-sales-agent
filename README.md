# Voice AI Sales Agent

![Next.js](https://img.shields.io/badge/Next.js-16-black?style=for-the-badge&logo=next.js)
![React](https://img.shields.io/badge/React-19-149eca?style=for-the-badge&logo=react&logoColor=white)
![OpenAI Agents SDK](https://img.shields.io/badge/OpenAI-Agents_SDK-412991?style=for-the-badge&logo=openai&logoColor=white)
![OpenAI Realtime](https://img.shields.io/badge/OpenAI-Realtime-111827?style=for-the-badge&logo=openai&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-Only-f7df1e?style=for-the-badge&logo=javascript&logoColor=111)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-38bdf8?style=for-the-badge&logo=tailwindcss&logoColor=white)

**A realtime ERP sales voice-agent template with discovery, solution consulting, revenue guardrails, objection handling, and CRM follow-up notes.**

Built by **[Suhas Bhairav](https://suhasbhairav.com)** as part of the **[AI Templates](https://suhasbhairav.com/ai-templates)**.

> Enterprise-grade starter template for teams that want a working realtime voice application surface, server-side API isolation, responsive UX, domain guardrails, and a clear path from prototype to production.

## Template Links

| Destination | URL |
| --- | --- |
| AI Templates Hub | [https://suhasbhairav.com/ai-templates](https://suhasbhairav.com/ai-templates) |
| This Template Page | [https://suhasbhairav.com/ai-templates/voice-ai-sales-agent](https://suhasbhairav.com/ai-templates/voice-ai-sales-agent) |
| Creator | [https://suhasbhairav.com](https://suhasbhairav.com) |
| OpenAI Realtime Docs | [https://platform.openai.com/docs/guides/realtime](https://platform.openai.com/docs/guides/realtime) |
| OpenAI Agents SDK JS | [https://openai.github.io/openai-agents-js/](https://openai.github.io/openai-agents-js/) |

## One-Click Deploy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fsuhasbhairav%2Fvoice-ai-sales-agent&env=OPENAI_API_KEY&envDescription=Add+the+server-side+OpenAI+API+key+required+by+this+template.+This+value+is+stored+as+a+deployment+environment+variable+and+is+not+committed+to+the+repository.&envLink=https%3A%2F%2Fgithub.com%2Fsuhasbhairav%2Fvoice-ai-sales-agent%23environment-variables)

Use the button above to clone and deploy this template directly from GitHub. The deploy flow will ask for `OPENAI_API_KEY` as a production environment variable before the app goes live.

## Executive Overview

Voice AI Sales Agent is designed for B2B software teams that need a working realtime voice sales workflow. It combines a Next.js frontend, OpenAI Realtime WebRTC audio, the OpenAI Agents SDK, server-created ephemeral client secrets, specialist agent handoffs, demo tools, and a polished responsive sales console.

The agent is configured to sell AtlasERP, a fictional ERP platform for finance, inventory, procurement, and operations teams. It runs discovery before pitching, maps buyer pain to value, checks revenue and legal risk, handles objections, and drafts CRM-ready follow-up notes.

## Best-Fit Use Cases

- B2B SaaS sales calls
- ERP discovery workflows
- Objection handling practice
- Sales enablement demos
- CRM note automation
- Revenue team AI prototypes

## Capability Map

- OpenAI Realtime voice session with `gpt-realtime-2.1`
- Browser microphone and model audio through WebRTC
- `@openai/agents/realtime` multi-agent handoffs
- Server-side `/api/realtime-token` route for ephemeral client secrets
- ERP sales host agent
- Discovery agent
- Solution consultant agent
- Revenue guardrail agent
- CRM follow-up agent
- Tools for account briefs, sales playbooks, guardrail checks, and outcome notes
- Voice selection, VAD controls, mute, interrupt, disconnect, and typed context
- Responsive transcript, tool-call, event-log, and agent-network UI

## Domain Guardrails

- Run discovery before pitching AtlasERP.
- Do not invent pricing, discounts, legal terms, implementation dates, security certifications, or customer logos.
- Escalate security, contract, pricing, and promise-risk commitments.
- Keep claims grounded in the configured product context.
- Draft CRM follow-ups with pain, stakeholders, objections, value hypothesis, and next step.

## Search And Discovery Keywords

`voice AI sales agent` · `AI sales agent template` · `OpenAI Realtime sales agent` · `Next.js voice sales template` · `ERP sales AI agent` · `B2B sales voice assistant` · `revenue guardrail AI agent` · `OpenAI Agents SDK sales template`

## Architecture

```text
Browser voice console
   ↓
Next.js App Router page
   ↓
POST /api/realtime-token
   ↓
OpenAI Realtime client secret
   ↓
RealtimeSession over WebRTC
   ↓
ERP sales host agent
   ↓
Specialist handoffs + tools
   ↓
Transcript, tool calls, events, CRM follow-up
```

## Project Structure

- `app/page.js`
- `app/layout.js`
- `app/globals.css`
- `app/api/realtime-token/route.js`
- `README.md`
- `package.json`

## API Surface

| Route | Purpose |
| --- | --- |
| `/api/realtime-token` | Creates a server-side OpenAI Realtime ephemeral client secret. |

## Output Contract

```json
{
  "value": "ephemeral_client_secret",
  "expiresAt": 1790000000,
  "session": {
    "id": "realtime_session_id",
    "type": "realtime"
  }
}
```

## Quick Start

```bash
cp .env.example .env.local
npm install
npm run dev
```

Open the app:

```text
http://localhost:3000
```

If port 3000 is already in use:

```bash
npm run dev -- -p 3001
```

## Environment Variables

| Variable | Required | Description |
| --- | --- | --- |
| `OPENAI_API_KEY` | Yes | Used server-side to create OpenAI Realtime ephemeral client secrets. |

## Implementation Notes

- Keep the OpenAI API key inside server-only routes.
- Keep realtime client secrets ephemeral and short-lived.
- Treat CRM follow-up output as a draft until connected to a CRM backend.
- Keep discovery notes, guardrail checks, tool calls, and revenue recommendations auditable.
- Add consent and recording disclosure before production phone or browser voice use.

## Production Hardening Checklist

| Area | Recommended Upgrade |
| --- | --- |
| Authentication | Add Clerk, Auth.js, Supabase Auth, or your identity provider. |
| Authorization | Scope accounts and opportunities by rep, team, territory, or workspace. |
| Persistence | Store transcripts, account briefs, tool calls, and CRM notes in a database. |
| CRM Integration | Connect the follow-up tool to Salesforce, HubSpot, Pipedrive, or your CRM. |
| Product Catalog | Replace AtlasERP demo context with your pricing, packaging, proof points, and objections. |
| Observability | Add structured logs, traces, latency metrics, and error capture. |
| Safety | Add legal, pricing, security, and claim-review approval workflows. |
| Deployment | Configure `OPENAI_API_KEY` in Vercel or your hosting platform. |

## Security Notes

- Never expose `OPENAI_API_KEY` in browser components.
- Do not commit `.env.local`.
- Do not store sensitive call transcripts without a retention policy.
- Review pricing, legal, and security claims before customer-facing deployment.
- Add rate limits before allowing public traffic.

## Extension Ideas

- Add CRM account and opportunity lookup.
- Add real meeting-booking handoff.
- Add sales methodology scoring.
- Add objection libraries and proof-point retrieval.
- Add manager coaching review.
- Add call summary email drafting.

## Troubleshooting

| Issue | Fix |
| --- | --- |
| Missing API key | Add `OPENAI_API_KEY` to `.env.local` or your deployment environment. |
| Browser microphone blocked | Allow microphone access in the browser and reload the page. |
| Realtime session fails | Check server logs for `/api/realtime-token` and verify the OpenAI key has realtime access. |
| CRM note not written | This starter drafts CRM notes; connect a CRM API for real writes. |
| Local server uses old code | Stop the dev server and restart with `npm run dev`. |

## Internal AI Template Links

- [AI Templates Hub](https://suhasbhairav.com/ai-templates)
- [This Template Page](https://suhasbhairav.com/ai-templates/voice-ai-sales-agent)
- [Voice AI Templates](https://suhasbhairav.com/ai-templates/voice)
- [OpenAI Templates](https://suhasbhairav.com/ai-templates/openai)

## Verification

```bash
npm run lint
npm run build
```

## License

MIT. Use this starter freely, adapt it for your product, and keep the creator attribution where appropriate.
