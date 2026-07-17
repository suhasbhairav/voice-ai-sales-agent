"use client";

import {
  Activity,
  Bot,
  BrainCircuit,
  CalendarClock,
  ClipboardCheck,
  Ear,
  FileText,
  Gauge,
  Mic,
  MicOff,
  PhoneOff,
  Play,
  Route,
  Send,
  ShieldCheck,
  Sparkles,
  Square,
  Wrench,
} from "lucide-react";
import { RealtimeAgent, RealtimeSession, tool } from "@openai/agents/realtime";
import { useMemo, useRef, useState } from "react";
import { z } from "zod";

const MODEL = "gpt-realtime-2.1";
const TRANSCRIPTION_MODEL = "gpt-4o-mini-transcribe";
const CONFIG = {
  "title": "Voice AI Sales Agent",
  "shortTitle": "Sales Voice Agent",
  "eyebrow": "Realtime ERP sales desk",
  "description": "A realtime voice sales agent for ERP software discovery, objection handling, stakeholder mapping, and CRM-ready follow-up.",
  "defaultMemory": "The product is AtlasERP, a mid-market ERP platform for finance, inventory, procurement, and operations teams.",
  "workflowLabel": "ERP sales call",
  "iconLabel": "ERP",
  "colors": {
    "background": "#fbf6f1",
    "surface": "#ffffff",
    "surfaceAlt": "#fff0df",
    "text": "#21160f",
    "muted": "#755f4d",
    "border": "#ead4bf",
    "accent": "#c75021",
    "accentDark": "#8f3214",
    "accentSoft": "#ffe5d4",
    "danger": "#9f1d1d",
    "gradientFrom": "#c75021",
    "gradientTo": "#d49b16"
  },
  "agents": {
    "host": "ERP Sales Host",
    "intake": "Discovery Agent",
    "specialist": "Solution Consultant",
    "guardrail": "Revenue Guardrail",
    "note": "CRM Follow-up Agent"
  },
  "domainInstructions": "You sell AtlasERP, a B2B ERP software platform. Run discovery before pitching. Qualify pain, current systems, timeline, budget range, stakeholders, integrations, and success criteria. Do not invent pricing, legal commitments, implementation guarantees, or customer logos. Keep claims grounded and ask for the next meeting when fit is clear.",
  "specialistInstructions": {
    "intake": "Qualify company size, current ERP or spreadsheets, operational pain, buying timeline, budget process, stakeholders, and next meeting goal.",
    "specialist": "Map AtlasERP capabilities to finance, inventory, procurement, reporting, integrations, and implementation concerns.",
    "guardrail": "Check pricing, security, legal, discount, competitive, and guarantee risk before making sales commitments.",
    "note": "Draft CRM-ready follow-up with pain, value hypothesis, stakeholders, objections, next step, and close plan."
  },
  "primaryTool": {
    "name": "lookup_account_brief",
    "description": "Return demo account research, ERP pain, stakeholders, and sales context.",
    "inputLabel": "account_name",
    "purposeLabel": "sales_goal",
    "resultKey": "accountBrief",
    "record": {
      "account": "Brightline Manufacturing",
      "segment": "Mid-market manufacturing",
      "pains": [
        "inventory variance",
        "manual purchase approvals",
        "month-end close delays"
      ],
      "targetValue": "Unify finance, procurement, and operations reporting in AtlasERP."
    }
  },
  "playbookTopics": [
    "ERP discovery",
    "inventory objection",
    "finance stakeholder pitch",
    "implementation risk"
  ],
  "riskAreas": [
    "pricing",
    "legal",
    "security",
    "promise",
    "none"
  ],
  "riskTriggers": "guarantee|discount|legal|contract|security certified|implementation date|customer logo",
  "demoPrompt": "Run an ERP sales demo. Use lookup_account_brief for Brightline Manufacturing, get_playbook for ERP discovery, run_guardrail_check on guaranteeing a 30-day implementation, then draft_outcome_note with a CRM follow-up.",
  "samplePrompts": [
    "Start discovery for a manufacturing ERP lead.",
    "Handle an objection about migration risk.",
    "Draft a CRM follow-up after the call."
  ],
  "metrics": [
    [
      "Discovery",
      "MEDDICC-lite"
    ],
    [
      "Guardrails",
      "Revenue claims"
    ],
    [
      "Output",
      "CRM follow-up"
    ]
  ]
};

const voices = [
  { id: "marin", label: "Marin", tone: "clear and measured" },
  { id: "cedar", label: "Cedar", tone: "warm and grounded" },
  { id: "verse", label: "Verse", tone: "bright and energetic" },
];

const vadProfiles = {
  balanced: {
    label: "Balanced",
    threshold: 0.55,
    silenceDurationMs: 650,
    prefixPaddingMs: 300,
  },
  fast: {
    label: "Fast turns",
    threshold: 0.5,
    silenceDurationMs: 430,
    prefixPaddingMs: 220,
  },
  deliberate: {
    label: "Deliberate",
    threshold: 0.62,
    silenceDurationMs: 900,
    prefixPaddingMs: 420,
  },
};

const initialEvents = [
  {
    id: "ready",
    type: "system",
    title: "Console ready",
    detail: "Realtime voice events, tools, and handoffs will stream here.",
    time: "Ready",
  },
];

function formatTime() {
  return new Date().toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function eventId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function getItemText(item) {
  if (!item || item.type !== "message" || !Array.isArray(item.content)) {
    return "";
  }

  return item.content
    .map((part) => part.text || part.transcript || "")
    .filter(Boolean)
    .join(" ")
    .trim();
}

function getItemLabel(item) {
  if (item?.role === "assistant") return "Agent";
  if (item?.role === "user") return "You";
  return "System";
}

function createVoiceTeam({ voice, memory }) {
  const primaryTool = tool({
    name: CONFIG.primaryTool.name,
    description: CONFIG.primaryTool.description,
    parameters: z.object({
      lookup: z.string().describe(CONFIG.primaryTool.inputLabel),
      purpose: z.string().describe(CONFIG.primaryTool.purposeLabel),
    }),
    async execute({ lookup, purpose }) {
      return JSON.stringify({
        lookup,
        purpose,
        [CONFIG.primaryTool.resultKey]: {
          ...CONFIG.primaryTool.record,
          requestedAt: new Date().toISOString(),
        },
      });
    },
  });

  const playbookTool = tool({
    name: "get_playbook",
    description: "Fetch demo operating guidance for this voice-agent workflow.",
    parameters: z.object({
      topic: z.string().describe("The playbook topic to retrieve."),
      urgency: z.enum(["low", "normal", "high"]).describe("Current urgency."),
    }),
    async execute({ topic, urgency }) {
      return JSON.stringify({
        topic,
        urgency,
        recommendedTopics: CONFIG.playbookTopics,
        steps: [
          "Confirm the user's current goal and time constraint.",
          "Ask one focused question before offering a recommendation.",
          "Use the guardrail tool before any sensitive, risky, or binding commitment.",
          "Draft a structured note when the conversation needs human follow-up.",
        ],
      });
    },
  });

  const guardrailTool = tool({
    name: "run_guardrail_check",
    description: "Classify whether the proposed spoken response needs review or redirection.",
    parameters: z.object({
      proposed_action: z.string().describe("The answer, question, or action being considered."),
      risk_area: z.enum(CONFIG.riskAreas).describe("The main risk area."),
    }),
    async execute({ proposed_action, risk_area }) {
      const riskyPattern = new RegExp(CONFIG.riskTriggers, "i");
      const requiresReview = risk_area !== "none" || riskyPattern.test(proposed_action);

      return JSON.stringify({
        proposed_action,
        risk_area,
        decision: requiresReview ? "redirect_or_human_review" : "ok_to_continue",
        guidance: requiresReview
          ? "Acknowledge the limit, avoid the risky commitment, and route to a safer next step."
          : "Continue with concise, domain-specific next steps.",
      });
    },
  });

  const outcomeTool = tool({
    name: "draft_outcome_note",
    description: "Draft a structured note, follow-up, or handoff summary from the conversation.",
    parameters: z.object({
      summary: z.string().describe("Short summary of the conversation."),
      next_action: z.string().describe("Recommended next action."),
      owner: z.string().describe("Who should own the next step."),
    }),
    async execute({ summary, next_action, owner }) {
      return JSON.stringify({
        noteId: `note_${Math.random().toString(16).slice(2, 8)}`,
        workflow: CONFIG.workflowLabel,
        summary,
        next_action,
        owner,
        createdAt: new Date().toISOString(),
      });
    },
  });

  const toolset = [primaryTool, playbookTool, guardrailTool, outcomeTool];

  const intakeAgent = new RealtimeAgent({
    name: CONFIG.agents.intake,
    handoffDescription: "Collects minimum context, qualification details, and success criteria.",
    instructions: `${CONFIG.specialistInstructions.intake} Keep spoken turns short. ${memory}`,
    tools: toolset,
  });

  const specialistAgent = new RealtimeAgent({
    name: CONFIG.agents.specialist,
    handoffDescription: "Handles the core domain work and recommends the next best step.",
    instructions: `${CONFIG.specialistInstructions.specialist} Use playbooks when a process is involved. ${memory}`,
    tools: toolset,
  });

  const guardrailAgent = new RealtimeAgent({
    name: CONFIG.agents.guardrail,
    handoffDescription: "Reviews policy, safety, privacy, fairness, promise, or approval risk.",
    instructions: `${CONFIG.specialistInstructions.guardrail} Be firm, brief, and useful. ${memory}`,
    tools: toolset,
  });

  const noteAgent = new RealtimeAgent({
    name: CONFIG.agents.note,
    handoffDescription: "Creates structured notes, follow-ups, and human handoff summaries.",
    instructions: `${CONFIG.specialistInstructions.note} Prefer crisp bullets when drafting notes. ${memory}`,
    tools: toolset,
  });

  const hostAgent = new RealtimeAgent({
    name: CONFIG.agents.host,
    voice,
    instructions: `${CONFIG.domainInstructions}

You are the host agent for ${CONFIG.title}, a working OpenAI Realtime voice-agent template.
- Speak in compact chunks because this is live audio.
- Ask one focused question at a time.
- Use handoffs when another specialist is better suited.
- Use tools when context, playbooks, guardrails, or notes would improve the result.
- Respect interruptions immediately and resume from the user's latest intent.
- Never claim a real-world backend action was completed outside the demo tools.
${memory}`,
    handoffs: [intakeAgent, specialistAgent, guardrailAgent, noteAgent],
    tools: toolset,
  });

  return {
    hostAgent,
    agents: [hostAgent, intakeAgent, specialistAgent, guardrailAgent, noteAgent],
  };
}

export default function Home() {
  const [status, setStatus] = useState("idle");
  const [activeAgent, setActiveAgent] = useState(CONFIG.agents.host);
  const [history, setHistory] = useState([]);
  const [events, setEvents] = useState(initialEvents);
  const [toolCalls, setToolCalls] = useState([]);
  const [textInput, setTextInput] = useState("");
  const [error, setError] = useState("");
  const [muted, setMuted] = useState(false);
  const [voice, setVoice] = useState("marin");
  const [vadProfile, setVadProfile] = useState("balanced");
  const [memory, setMemory] = useState(CONFIG.defaultMemory);
  const sessionRef = useRef(null);

  const isConnecting = status === "connecting";
  const isLive = status === "connected" || status === "speaking";
  const isLocked = isConnecting || isLive;
  const currentVad = vadProfiles[vadProfile];
  const selectedVoice = voices.find((item) => item.id === voice) ?? voices[0];

  const transcript = useMemo(
    () =>
      history
        .filter((item) => item.type === "message" && item.role !== "system")
        .map((item) => ({
          id: item.itemId,
          role: item.role,
          label: getItemLabel(item),
          text: getItemText(item),
          status: item.status,
        }))
        .filter((item) => item.text || item.status === "in_progress"),
    [history],
  );

  const architectureCards = [
    {
      icon: Route,
      title: "Agent team",
      value: "5 agents",
      detail: "Host, intake, specialist, guardrail, notes",
    },
    {
      icon: Wrench,
      title: "Tools",
      value: "4 live demos",
      detail: "Context, playbook, guardrail, outcome note",
    },
    {
      icon: Ear,
      title: "Turn taking",
      value: currentVad.label,
      detail: `${currentVad.silenceDurationMs}ms silence window`,
    },
    {
      icon: ShieldCheck,
      title: "Rules",
      value: "Domain-safe",
      detail: CONFIG.metrics[1][1],
    },
  ];

  function addEvent(type, title, detail) {
    setEvents((current) => [
      {
        id: eventId(),
        type,
        title,
        detail,
        time: formatTime(),
      },
      ...current,
    ].slice(0, 14));
  }

  async function fetchEphemeralToken() {
    const response = await fetch("/api/realtime-token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        voice,
        vad: currentVad,
      }),
    });

    if (!response.ok) {
      const details = await response.text();
      throw new Error(details || "Could not create a Realtime client secret.");
    }

    const data = await response.json();

    if (!data.value) {
      throw new Error("The token endpoint did not return a client secret.");
    }

    return data;
  }

  async function startSession() {
    if (isLocked) return;

    setError("");
    setStatus("connecting");
    setHistory([]);
    setToolCalls([]);
    setEvents([]);
    addEvent("auth", "Requesting ephemeral key", `${MODEL} with ${voice}`);

    try {
      const token = await fetchEphemeralToken();
      const { hostAgent } = createVoiceTeam({ voice, memory });

      const session = new RealtimeSession(hostAgent, {
        model: MODEL,
        config: {
          outputModalities: ["audio"],
          audio: {
            input: {
              transcription: {
                model: TRANSCRIPTION_MODEL,
              },
              turnDetection: {
                type: "server_vad",
                threshold: currentVad.threshold,
                prefixPaddingMs: currentVad.prefixPaddingMs,
                silenceDurationMs: currentVad.silenceDurationMs,
                interruptResponse: true,
                createResponse: true,
              },
            },
            output: {
              voice,
            },
          },
        },
        workflowName: "voice-ai-sales-agent",
        tracingDisabled: false,
      });

      session.on("history_updated", (nextHistory) => {
        setHistory([...nextHistory]);
      });

      session.on("agent_start", (_context, agent) => {
        setActiveAgent(agent.name);
        addEvent("agent", `${agent.name} started`, "Generating a spoken response");
      });

      session.on("agent_end", (_context, agent, output) => {
        setActiveAgent(agent.name);
        addEvent("agent", `${agent.name} finished`, output?.slice(0, 120) || "Turn complete");
      });

      session.on("agent_handoff", (_context, fromAgent, toAgent) => {
        setActiveAgent(toAgent.name);
        addEvent("handoff", "Agent handoff", `${fromAgent.name} -> ${toAgent.name}`);
      });

      session.on("agent_tool_start", (_context, agent, activeTool, details) => {
        const call = {
          id: details?.toolCall?.callId || eventId(),
          agent: agent.name,
          tool: activeTool.name,
          input: details?.toolCall?.arguments || "{}",
          output: "Running...",
          time: formatTime(),
        };

        setToolCalls((current) => [call, ...current].slice(0, 8));
        addEvent("tool", `${agent.name} called ${activeTool.name}`, call.input);
      });

      session.on("agent_tool_end", (_context, agent, activeTool, output, details) => {
        const callId = details?.toolCall?.callId;

        setToolCalls((current) => {
          const outputText =
            typeof output === "string" ? output : JSON.stringify(output);

          return current.map((call) =>
            call.id === callId ||
            (!callId && call.tool === activeTool.name && call.agent === agent.name)
              ? {
                  ...call,
                  output: outputText,
                }
              : call,
          );
        });
        addEvent("tool", `${activeTool.name} returned`, "Tool output added to context");
      });

      session.on("audio_start", (_context, agent) => {
        setStatus("speaking");
        setActiveAgent(agent.name);
      });

      session.on("audio_stopped", (_context, agent) => {
        setStatus("connected");
        setActiveAgent(agent.name);
      });

      session.on("audio_interrupted", () => {
        setStatus("connected");
        addEvent("audio", "Audio interrupted", "The assistant yielded to the user");
      });

      session.on("error", (sessionError) => {
        console.error("Realtime session error:", sessionError);
        setError("Realtime session error. Check the browser console and server logs.");
        setStatus("error");
      });

      sessionRef.current = session;
      await session.connect({ apiKey: token.value });

      setStatus("connected");
      setMuted(false);
      addEvent("connected", "Realtime session connected", token.session?.id || "WebRTC live");
      session.sendMessage(`Greet me for the ${CONFIG.workflowLabel} workflow, state your boundary in one sentence, and ask for the first useful detail.`);
    } catch (sessionError) {
      console.error("Could not start realtime session:", sessionError);
      setError(sessionError.message);
      setStatus("error");
      sessionRef.current?.close();
      sessionRef.current = null;
    }
  }

  function stopSession() {
    sessionRef.current?.close();
    sessionRef.current = null;
    setStatus("idle");
    setMuted(false);
    setActiveAgent(CONFIG.agents.host);
    addEvent("disconnected", "Session disconnected", "Local session closed");
  }

  function toggleMute() {
    const nextMuted = !muted;
    sessionRef.current?.mute(nextMuted);
    setMuted(nextMuted);
    addEvent("audio", nextMuted ? "Microphone muted" : "Microphone unmuted", "");
  }

  function interrupt() {
    sessionRef.current?.interrupt();
    setStatus("connected");
    addEvent("audio", "Stop speaking requested", "Manual interruption sent");
  }

  function sendTextMessage(event) {
    event.preventDefault();
    const trimmed = textInput.trim();

    if (!trimmed || !sessionRef.current) return;

    sessionRef.current.sendMessage(trimmed);
    setTextInput("");
    addEvent("text", "Typed message sent", trimmed.slice(0, 120));
  }

  function runToolDemo() {
    if (!sessionRef.current) return;

    sessionRef.current.sendMessage(CONFIG.demoPrompt);
    addEvent("tool", "Tool demo requested", "Context, playbook, guardrail, and note");
  }

  const panelStyle = {
    backgroundColor: CONFIG.colors.surface,
    borderColor: CONFIG.colors.border,
  };
  const softStyle = {
    backgroundColor: CONFIG.colors.surfaceAlt,
    borderColor: CONFIG.colors.border,
  };
  const accentStyle = {
    backgroundColor: CONFIG.colors.accent,
    color: "white",
  };

  return (
    <main
      className="min-h-screen"
      style={{ backgroundColor: CONFIG.colors.background, color: CONFIG.colors.text }}
    >
      <section className="mx-auto flex min-h-screen w-full max-w-[1800px] flex-col gap-3 p-3 sm:p-4">
        <header
          className="overflow-hidden border shadow-sm"
          style={{
            borderColor: CONFIG.colors.border,
            background: `linear-gradient(115deg, ${CONFIG.colors.gradientFrom}, ${CONFIG.colors.gradientTo})`,
          }}
        >
          <div className="grid gap-5 p-5 text-white lg:grid-cols-[minmax(0,1fr)_30rem] lg:items-end lg:p-6">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="border border-white/30 bg-white/15 px-3 py-1 text-xs font-black uppercase tracking-[0.16em]">
                  {CONFIG.eyebrow}
                </span>
                <span className="border border-white/30 bg-white/15 px-3 py-1 text-xs font-black uppercase tracking-[0.16em]">
                  {MODEL}
                </span>
              </div>
              <h1 className="mt-4 max-w-4xl text-3xl font-black tracking-tight sm:text-5xl">
                {CONFIG.title}
              </h1>
              <p className="mt-3 max-w-3xl text-sm font-semibold leading-6 text-white/82 sm:text-base">
                {CONFIG.description}
              </p>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {CONFIG.metrics.map(([label, value]) => (
                <div key={label} className="border border-white/25 bg-white/14 p-3">
                  <p className="text-[11px] font-black uppercase tracking-[0.14em] text-white/70">
                    {label}
                  </p>
                  <p className="mt-2 text-lg font-black">{value}</p>
                </div>
              ))}
            </div>
          </div>
        </header>

        <section className="grid min-h-0 flex-1 gap-3 xl:grid-cols-[20rem_minmax(0,1fr)_22rem]">
          <aside className="grid gap-3 xl:min-h-0 xl:content-start">
            <section className="border p-4 shadow-sm" style={panelStyle}>
              <div className="flex items-center gap-3">
                <div className="grid size-12 place-items-center text-sm font-black" style={accentStyle}>
                  {CONFIG.iconLabel}
                </div>
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.16em]" style={{ color: CONFIG.colors.muted }}>
                    Voice console
                  </p>
                  <h2 className="text-xl font-black">{CONFIG.shortTitle}</h2>
                </div>
              </div>

              <div className="mt-5 grid gap-3">
                <label className="grid gap-2">
                  <span className="text-xs font-black uppercase tracking-[0.14em]" style={{ color: CONFIG.colors.muted }}>
                    Voice
                  </span>
                  <select
                    className="h-11 border bg-white px-3 text-sm font-bold outline-none disabled:opacity-60"
                    style={{ borderColor: CONFIG.colors.border }}
                    value={voice}
                    onChange={(event) => setVoice(event.target.value)}
                    disabled={isLocked}
                  >
                    {voices.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                  <span className="text-xs font-semibold" style={{ color: CONFIG.colors.muted }}>
                    {selectedVoice.tone}
                  </span>
                </label>

                <label className="grid gap-2">
                  <span className="text-xs font-black uppercase tracking-[0.14em]" style={{ color: CONFIG.colors.muted }}>
                    Turn detection
                  </span>
                  <select
                    className="h-11 border bg-white px-3 text-sm font-bold outline-none disabled:opacity-60"
                    style={{ borderColor: CONFIG.colors.border }}
                    value={vadProfile}
                    onChange={(event) => setVadProfile(event.target.value)}
                    disabled={isLocked}
                  >
                    {Object.entries(vadProfiles).map(([id, profile]) => (
                      <option key={id} value={id}>
                        {profile.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="grid gap-2">
                  <span className="text-xs font-black uppercase tracking-[0.14em]" style={{ color: CONFIG.colors.muted }}>
                    Session memory
                  </span>
                  <textarea
                    className="min-h-28 resize-none border bg-white p-3 text-sm font-medium leading-5 outline-none disabled:opacity-60"
                    style={{ borderColor: CONFIG.colors.border }}
                    value={memory}
                    onChange={(event) => setMemory(event.target.value)}
                    disabled={isLocked}
                  />
                </label>
              </div>

              {error ? (
                <p
                  className="mt-4 border p-3 text-sm font-bold leading-6"
                  style={{ borderColor: CONFIG.colors.danger, color: CONFIG.colors.danger, backgroundColor: "#fff7f5" }}
                >
                  {error}
                </p>
              ) : null}

              <div className="mt-5 grid gap-2">
                {!isLive && !isConnecting ? (
                  <button
                    className="flex h-12 items-center justify-center gap-2 px-4 text-sm font-black text-white transition"
                    style={accentStyle}
                    onClick={startSession}
                    type="button"
                  >
                    <Play size={18} />
                    Start session
                  </button>
                ) : (
                  <button
                    className="flex h-12 items-center justify-center gap-2 px-4 text-sm font-black text-white transition"
                    style={{ backgroundColor: CONFIG.colors.danger }}
                    onClick={stopSession}
                    type="button"
                  >
                    <PhoneOff size={18} />
                    Disconnect
                  </button>
                )}

                <div className="grid grid-cols-2 gap-2">
                  <button
                    className="flex h-11 items-center justify-center gap-2 border bg-white px-3 text-sm font-black transition disabled:cursor-not-allowed disabled:opacity-45"
                    style={{ borderColor: CONFIG.colors.border, color: CONFIG.colors.text }}
                    onClick={toggleMute}
                    disabled={!isLive && status !== "speaking"}
                    type="button"
                  >
                    {muted ? <MicOff size={17} /> : <Mic size={17} />}
                    {muted ? "Unmute" : "Mute"}
                  </button>
                  <button
                    className="flex h-11 items-center justify-center gap-2 border bg-white px-3 text-sm font-black transition disabled:cursor-not-allowed disabled:opacity-45"
                    style={{ borderColor: CONFIG.colors.border, color: CONFIG.colors.text }}
                    onClick={interrupt}
                    disabled={!isLive && status !== "speaking"}
                    type="button"
                  >
                    <Square size={16} />
                    Stop
                  </button>
                </div>
              </div>
            </section>

            <section className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-2">
              {architectureCards.map((card) => {
                const Icon = card.icon;
                return (
                  <div key={card.title} className="border p-3" style={softStyle}>
                    <Icon size={18} style={{ color: CONFIG.colors.accent }} />
                    <p className="mt-3 text-xs font-black uppercase tracking-[0.12em]" style={{ color: CONFIG.colors.muted }}>
                      {card.title}
                    </p>
                    <p className="mt-1 text-lg font-black">{card.value}</p>
                    <p className="mt-1 text-xs leading-5" style={{ color: CONFIG.colors.muted }}>
                      {card.detail}
                    </p>
                  </div>
                );
              })}
            </section>
          </aside>

          <section className="flex min-h-[72vh] flex-col overflow-hidden border shadow-sm xl:min-h-0" style={panelStyle}>
            <header className="border-b p-4 sm:p-5" style={{ borderColor: CONFIG.colors.border }}>
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em]" style={{ color: CONFIG.colors.muted }}>
                    <Activity size={15} />
                    {CONFIG.workflowLabel}
                  </div>
                  <h2 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">
                    Live conversation
                  </h2>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {["idle", "connecting", "connected", "speaking"].map((item) => (
                    <div
                      key={item}
                      className="border px-3 py-2 text-center text-xs font-black uppercase tracking-[0.08em]"
                      style={{
                        borderColor: status === item ? CONFIG.colors.accent : CONFIG.colors.border,
                        backgroundColor: status === item ? CONFIG.colors.accentSoft : CONFIG.colors.surfaceAlt,
                        color: status === item ? CONFIG.colors.accentDark : CONFIG.colors.muted,
                      }}
                    >
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            </header>

            <div className="border-b px-4 py-3" style={softStyle}>
              <div className="flex flex-wrap items-center gap-2 text-sm font-bold">
                <span className="flex items-center gap-2 border bg-white px-3 py-2" style={{ borderColor: CONFIG.colors.border }}>
                  <Sparkles size={16} style={{ color: CONFIG.colors.accent }} />
                  Active: {activeAgent}
                </span>
                <span className="flex items-center gap-2 border bg-white px-3 py-2" style={{ borderColor: CONFIG.colors.border }}>
                  <Gauge size={16} style={{ color: CONFIG.colors.accent }} />
                  {TRANSCRIPTION_MODEL}
                </span>
                <span className="flex items-center gap-2 border bg-white px-3 py-2" style={{ borderColor: CONFIG.colors.border }}>
                  <CalendarClock size={16} style={{ color: CONFIG.colors.accent }} />
                  {currentVad.label}
                </span>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5" style={{ backgroundColor: CONFIG.colors.background }}>
              {transcript.length === 0 ? (
                <div className="grid h-full min-h-[24rem] place-items-center border border-dashed p-6 text-center" style={panelStyle}>
                  <div className="max-w-xl">
                    <div className="mx-auto grid size-16 place-items-center text-white" style={accentStyle}>
                      <Mic size={28} />
                    </div>
                    <p className="mt-5 text-2xl font-black">Start a realtime voice session</p>
                    <p className="mt-3 text-sm leading-6" style={{ color: CONFIG.colors.muted }}>
                      The browser connects with an ephemeral OpenAI Realtime client secret,
                      streams microphone audio over WebRTC, and exposes agent handoffs,
                      tool calls, transcript updates, and interruption controls.
                    </p>
                    <div className="mt-5 flex flex-wrap justify-center gap-2">
                      {CONFIG.samplePrompts.map((prompt) => (
                        <button
                          key={prompt}
                          className="border bg-white px-3 py-2 text-xs font-bold"
                          style={{ borderColor: CONFIG.colors.border, color: CONFIG.colors.text }}
                          onClick={() => setMemory(prompt)}
                          disabled={isLocked}
                          type="button"
                        >
                          {prompt}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mx-auto flex w-full max-w-5xl flex-col gap-4">
                  {transcript.map((item) => (
                    <article
                      key={item.id}
                      className={`flex ${item.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className="max-w-[92%] border px-4 py-3 shadow-sm sm:max-w-[86%]"
                        style={
                          item.role === "user"
                            ? { borderColor: CONFIG.colors.accent, backgroundColor: CONFIG.colors.accent, color: "white" }
                            : panelStyle
                        }
                      >
                        <p
                          className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.12em]"
                          style={{ color: item.role === "user" ? "rgba(255,255,255,0.72)" : CONFIG.colors.muted }}
                        >
                          {item.role === "user" ? <Mic size={13} /> : <Bot size={13} />}
                          {item.label}
                        </p>
                        <p className="mt-2 whitespace-pre-wrap text-sm leading-6">
                          {item.text || "Listening..."}
                        </p>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>

            <form className="border-t p-4" style={panelStyle} onSubmit={sendTextMessage}>
              <div className="flex gap-2 border bg-white p-2" style={{ borderColor: CONFIG.colors.border }}>
                <input
                  className="min-w-0 flex-1 bg-transparent px-3 py-3 text-sm font-semibold outline-none"
                  placeholder="Send typed context into the active voice session..."
                  value={textInput}
                  onChange={(event) => setTextInput(event.target.value)}
                  disabled={!isLive && status !== "speaking"}
                />
                <button
                  className="grid size-12 place-items-center text-white transition disabled:cursor-not-allowed disabled:opacity-45"
                  style={accentStyle}
                  disabled={!textInput.trim() || (!isLive && status !== "speaking")}
                  type="submit"
                  title="Send message"
                >
                  <Send size={19} />
                </button>
              </div>
            </form>
          </section>

          <aside className="grid min-h-0 gap-3 lg:grid-cols-3 xl:grid-cols-1 xl:overflow-y-auto">
            <section className="border p-4" style={panelStyle}>
              <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em]" style={{ color: CONFIG.colors.muted }}>
                <BrainCircuit size={15} />
                Agent network
              </p>
              <div className="mt-3 grid gap-2">
                {Object.values(CONFIG.agents).map((name) => (
                  <div
                    key={name}
                    className="border px-3 py-2 text-sm font-black"
                    style={{
                      borderColor: activeAgent === name ? CONFIG.colors.accent : CONFIG.colors.border,
                      backgroundColor: activeAgent === name ? CONFIG.colors.accentSoft : CONFIG.colors.surfaceAlt,
                      color: activeAgent === name ? CONFIG.colors.accentDark : CONFIG.colors.text,
                    }}
                  >
                    {name}
                  </div>
                ))}
              </div>
            </section>

            <section className="border p-4" style={panelStyle}>
              <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em]" style={{ color: CONFIG.colors.muted }}>
                <ClipboardCheck size={15} />
                Tool calls
              </p>
              <div className="mt-3 grid gap-2">
                {toolCalls.length === 0 ? (
                  <div className="grid gap-2">
                    <p className="border border-dashed p-3 text-sm leading-6" style={{ borderColor: CONFIG.colors.border, color: CONFIG.colors.muted }}>
                      Tool activity appears when the agent needs context, playbooks, guardrails, or notes.
                    </p>
                    <button
                      className="flex h-10 items-center justify-center gap-2 border bg-white px-3 text-xs font-black uppercase tracking-[0.1em] transition disabled:cursor-not-allowed disabled:opacity-45"
                      style={{ borderColor: CONFIG.colors.border, color: CONFIG.colors.text }}
                      disabled={!isLive && status !== "speaking"}
                      onClick={runToolDemo}
                      type="button"
                    >
                      <Wrench size={15} />
                      Run demo
                    </button>
                  </div>
                ) : (
                  toolCalls.map((call) => (
                    <article key={call.id} className="border p-3" style={softStyle}>
                      <p className="text-xs font-black uppercase tracking-[0.1em]" style={{ color: CONFIG.colors.muted }}>
                        {call.time} / {call.agent}
                      </p>
                      <p className="mt-1 text-sm font-black">{call.tool}</p>
                      <p className="mt-2 line-clamp-3 break-words text-xs leading-5" style={{ color: CONFIG.colors.muted }}>
                        {call.output}
                      </p>
                    </article>
                  ))
                )}
              </div>
            </section>

            <section className="border p-4" style={panelStyle}>
              <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em]" style={{ color: CONFIG.colors.muted }}>
                <FileText size={15} />
                Event log
              </p>
              <div className="mt-3 grid gap-2">
                {events.map((event) => (
                  <article key={event.id} className="border p-3" style={softStyle}>
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-black uppercase tracking-[0.1em]" style={{ color: CONFIG.colors.muted }}>
                        {event.type}
                      </p>
                      <p className="text-xs font-black" style={{ color: CONFIG.colors.muted }}>{event.time}</p>
                    </div>
                    <p className="mt-1 text-sm font-black">{event.title}</p>
                    {event.detail ? (
                      <p className="mt-1 break-words text-xs leading-5" style={{ color: CONFIG.colors.muted }}>
                        {event.detail}
                      </p>
                    ) : null}
                  </article>
                ))}
              </div>
            </section>
          </aside>
        </section>
      </section>
    </main>
  );
}
