# Voice AI Sales Agent

A realtime voice sales agent for ERP software discovery, objection handling, stakeholder mapping, and CRM-ready follow-up.

Built with Next.js, the OpenAI Agents SDK realtime package, OpenAI Realtime, WebRTC audio, server-created ephemeral client secrets, specialist handoffs, demo tools, and domain-specific guardrails.

## Features

- OpenAI Realtime voice session using `gpt-realtime-2.1`
- `@openai/agents/realtime` multi-agent handoffs
- Server-side `/api/realtime-token` endpoint for ephemeral client secrets
- Voice selection, VAD controls, mute, interrupt, disconnect, and typed context
- Domain tools for context lookup, playbooks, guardrail checks, and outcome notes
- Responsive dashboard UI with transcript, tool calls, event log, and agent network

## Environment

Create `.env.local`:

```bash
OPENAI_API_KEY=your_openai_api_key
```

## Run

```bash
npm install
npm run dev
```

Open http://localhost:3000 and start a realtime voice session.

## Domain

This template is configured for ERP sales call. The agent instructions, specialist handoffs, demo tools, and guardrails are tailored to this workflow instead of using generic voice-agent copy.

## Links

- Website: https://suhasbhairav.com
- AI Templates: https://suhasbhairav.com/ai-templates
- OpenAI Realtime: https://platform.openai.com/docs/guides/realtime
- OpenAI Agents SDK: https://openai.github.io/openai-agents-js/
