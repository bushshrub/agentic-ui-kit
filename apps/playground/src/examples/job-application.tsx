import { AgentProvider, Badge, ChatTheme, Panel, useAgentContext, useChatTool, type ChatTool } from "agentic-ui-kit";
import { clsx } from "clsx";
import { FileCheck2 } from "lucide-react";
import { useState } from "react";
import { AgentChat } from "../lib/agent-chat";
import { scriptedAgent } from "../lib/scripted-agent";
import { useFlash } from "./flash";

/*
 * A job application assistant. The page owns the form; the agent fills it through a client tool,
 * reads the résumé through a server tool, and submitting (server side) needs the user's OK.
 */

const job = {
  company: "Northwind Robotics",
  role: "Frontend Engineer, Fleet Console",
  location: "Berlin or remote (EU)",
  requirements: ["4+ years of React and TypeScript", "Real-time dashboards", "Accessibility"],
};

type Fields = Record<"fullName" | "email" | "phone" | "linkedin" | "authorization" | "salary" | "start" | "whyUs", string>;
const empty: Fields = { fullName: "", email: "", phone: "", linkedin: "", authorization: "", salary: "", start: "", whyUs: "" };
const labels: Record<keyof Fields, string> = {
  fullName: "Full name",
  email: "Email",
  phone: "Phone",
  linkedin: "LinkedIn",
  authorization: "Work authorization",
  salary: "Salary expectation",
  start: "Earliest start",
  whyUs: `Why ${job.company}?`,
};

const whyUs =
  "I've spent four years building real-time React dashboards, most recently a monitoring console for 2,000 edge devices at Kestrel. Northwind's fleet console is the same problem at a scale I'd love to work on, and your focus on accessibility matches how I build: keyboard-first, screen-reader tested.";

const transport = () =>
  scriptedAgent(async function* ({ last, text, thinking, call, finish, request }) {
    const form = (request.context?.application ?? {}) as Partial<Fields>;
    if (!last) {
      yield* thinking("Reading the posting", `The role is ${job.role} at ${job.company}. They want React, TypeScript, real-time dashboards and accessibility. I'll read the résumé, then fill in what it covers and leave out what it doesn't.`);
      yield* text("I'll pull your details from your résumé, then fill in the form.");
      yield* call("read_resume", { file: "alex-morgan-cv.pdf" }, {
        takes: 1100,
        result: { name: "Alex Morgan", email: "alex@example.com", phone: "+49 30 23125 456", linkedin: "linkedin.com/in/example-alex-morgan", authorization: "EU citizen", experience: "4 years, Kestrel (monitoring console)" },
      });
      const fields: Partial<Fields> = { fullName: "Alex Morgan", phone: "+49 30 23125 456", linkedin: "linkedin.com/in/example-alex-morgan", authorization: "EU citizen, no sponsorship needed", start: "1 February 2027" };
      if (!form.email) fields.email = "alex@example.com";
      yield* text(form.email ? "Got it. You already typed an email, so I'll keep yours and fill the rest." : "Got it. Filling in the basics.");
      yield* call("fill_fields", { fields }, { runsOn: "client" });
    } else if (last.name === "fill_fields" && last.status === "error") {
      yield* text(`I couldn't fill in the form: ${last.error}.`);
    } else if (last.name === "fill_fields" && !("whyUs" in ((last.input as { fields: object }).fields ?? {}))) {
      yield* text(`Now a short answer for "Why ${job.company}?", based on the posting and your Kestrel work.`);
      yield* call("fill_fields", { fields: { whyUs } }, { runsOn: "client" });
    } else if (last.name === "fill_fields") {
      yield* text("Everything's filled in except salary: you haven't told me a number, so I left it for you. Shall I submit?");
      yield* call("submit_application", { company: job.company, role: job.role }, { needsApproval: true });
    } else if (last.name === "submit_application") {
      if (last.approval === "granted") {
        yield* finish(last, { reference: "NWR-2207", submittedAt: new Date().toISOString() }, 1300);
        yield* text("Submitted. Your reference is NWR-2207; I'll add it to your tracker and remind you in a week if there's no reply.");
      } else yield* text("Okay, not submitted. Edit anything you like and tell me when it's ready.");
    }
  });

function JobPage() {
  const [values, setValues] = useState<Fields>(empty);
  const [resume, setResume] = useState<string>();
  const [submitted, setSubmitted] = useState<string>();
  const [flashing, flash] = useFlash();

  useAgentContext("job", job);
  useAgentContext("application", values);

  useChatTool<{ file: string }, { name: string; experience: string }>({
    name: "read_resume",
    view: { label: () => "Read your résumé", subtitle: (p) => (p.input as { file?: string })?.file, summary: () => "read your résumé" },
    onResult: (part) => part.status === "done" && setResume(part.input.file),
  });

  const fillFields: ChatTool<{ fields: Partial<Fields> }, { filled: string[] }> = {
    name: "fill_fields",
    description: "Fill in fields of the application form on screen. Only fields you have facts for.",
    inputSchema: { type: "object", properties: { fields: { type: "object", properties: Object.fromEntries(Object.keys(empty).map((k) => [k, { type: "string" }])) } }, required: ["fields"] },
    execute: ({ fields }) => {
      const keys = Object.keys(fields).filter((k) => k in empty);
      setValues((v) => ({ ...v, ...fields }));
      flash(keys);
      return { filled: keys };
    },
    view: {
      label: (p) => {
        const n = Object.keys((p.input as { fields?: object })?.fields ?? {}).length;
        return p.status === "done" ? `Filled in ${n} field${n === 1 ? "" : "s"}` : "Filling in the form";
      },
      summary: () => "filled in the form",
      Detail: ({ part }) => (
        <dl className="m-0 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
          {Object.entries((part.input as { fields?: Record<string, string> })?.fields ?? {}).map(([k, v]) => (
            <div key={k} className="contents">
              <dt className="text-chat-muted">{labels[k as keyof Fields] ?? k}</dt>
              <dd className="m-0 line-clamp-2">{v}</dd>
            </div>
          ))}
        </dl>
      ),
    },
  };
  useChatTool(fillFields);

  useChatTool<{ company: string; role: string }, { reference: string }>({
    name: "submit_application",
    view: {
      label: (p) => (p.status === "done" ? "Submitted the application" : "Submit the application"),
      summary: () => "submitted the application",
      ask: () => `Submit your application to ${job.company}?`,
      Detail: () => (
        <p className="m-0 text-sm">
          Sends your application for <strong>{job.role}</strong> to {job.company}, with {Object.values(values).filter(Boolean).length} of 8 fields filled and your résumé attached.
        </p>
      ),
    },
    onResult: (part) => part.status === "done" && setSubmitted(part.result?.reference),
  });

  const field = (key: keyof Fields, multiline = false) => (
    <label key={key} className={clsx("flex flex-col gap-1 text-sm", multiline && "col-span-2")}>
      <span className="text-chat-muted">{labels[key]}</span>
      {(() => {
        const props = {
          value: values[key],
          onChange: (e: { target: { value: string } }) => setValues((v) => ({ ...v, [key]: e.target.value })),
          disabled: !!submitted,
          className: clsx(
            "rounded-chat-sm border bg-chat-surface px-3 text-chat-fg outline-none transition-[box-shadow,border-color] duration-700 focus:border-chat-border-strong",
            flashing.has(key) ? "border-chat-accent shadow-[0_0_0_3px_color-mix(in_srgb,var(--chat-accent)_25%,transparent)]" : "border-chat-border",
          ),
        };
        return multiline ? <textarea rows={4} {...props} className={clsx(props.className, "resize-none py-2 leading-relaxed")} /> : <input {...props} className={clsx(props.className, "h-9")} />;
      })()}
    </label>
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto p-6">
      <header className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <h1 className="m-0 text-xl font-semibold">{job.role}</h1>
          {submitted ? <Badge tone="outline">Submitted · {submitted}</Badge> : <Badge tone="outline">Draft</Badge>}
        </div>
        <p className="m-0 text-sm text-chat-muted">
          {job.company} · {job.location}
        </p>
      </header>
      <div className={clsx("flex items-center gap-2 rounded-chat-md border border-chat-border bg-chat-surface px-3 py-2 text-sm", resume ? "text-chat-fg" : "text-chat-muted")}>
        <FileCheck2 className={clsx("size-4", resume ? "text-chat-accent" : "text-chat-subtle")} />
        {resume ? `${resume} read by the agent` : "Résumé not read yet"}
      </div>
      <form className="grid grid-cols-2 gap-4" onSubmit={(e) => e.preventDefault()}>
        {(["fullName", "email", "phone", "linkedin", "authorization", "salary", "start"] as const).map((k) => field(k))}
        {field("whyUs", true)}
      </form>
    </div>
  );
}

export function JobApplicationExample({ layout }: { layout: "panel" | "inline" }) {
  const chat = <AgentChat transport={transport} title="Application assistant" suggestions={["Fill in this application"]} density={layout} />;
  return (
    <AgentProvider>
      <ChatTheme theme="warm" className="flex h-dvh">
        {layout === "panel" ? (
          <>
            <JobPage />
            <Panel variant="flush" aria-label="Assistant" className="w-[26rem] shrink-0 border-l border-chat-border">
              {chat}
            </Panel>
          </>
        ) : (
          <div className="flex min-w-0 flex-1 flex-col">
            <JobPage />
            <div className="mx-6 mb-6 h-80 shrink-0 overflow-hidden rounded-chat-md border border-chat-border bg-chat-surface">{chat}</div>
          </div>
        )}
      </ChatTheme>
    </AgentProvider>
  );
}
