import Image from "next/image";
import { ArrowRight, Blocks, Bot, Check, Command, Download, Sparkles } from "lucide-react";

const bentoCards = [
  {
    title: "Tasks That Stay With Your Code",
    body: "No more tickets drifting from your codebase. Tasks live in your repo as markdown files.",
    visual: "agelum create task \"Implement auth\"",
    className: "col-6",
  },
  {
    title: "Agent Definitions and Skills",
    body: "Give AI tools structured access through agent definitions and reusable project skills.",
    visual: "agent://project-context  skills://release-checklist",
    className: "col-6",
  },
  {
    title: "Everything from the CLI",
    body: "Run every Agelum operation with the CLI. Humans and agents can execute the same commands.",
    visual: "agelum create | agelum move | agelum get",
    className: "col-4",
  },
  {
    title: "Built for Extensibility",
    body: "Customize workflows, define your own agents, and add plugins tailored to your team.",
    visual: "plugins/  agents/  skills/",
    className: "col-4",
  },
  {
    title: "Local-First, Always Yours",
    body: "Your data, your files, your control. No cloud lock-in. Just markdown in a folder you own.",
    visual: "git add .agelum/work/tasks/*.md",
    className: "col-4",
  },
  {
    title: "From Backlog to Done",
    body: "Simple Kanban workflow: backlog -> doing -> done. No ceremonies, just progress.",
    visual: "state: backlog -> doing -> done",
    className: "col-8",
  },
  {
    title: "Custom AI Tooling",
    body: "Create custom tools around Agelum docs so your agents can automate planning, delivery, and reviews.",
    visual: "agelum get task --json | custom-agent review",
    className: "col-4",
  },
];

const steps = [
  {
    icon: Command,
    title: "Initialize",
    body: "Bootstrap your workspace and generate the project structure in seconds.",
    code: "npx agelum init",
  },
  {
    icon: Download,
    title: "Create",
    body: "Create tasks, docs, plans, and epics with CLI commands that write markdown in your repo.",
    code: "agelum create task \"Ship landing page\"",
  },
  {
    icon: Bot,
    title: "Ship",
    body: "Use agent definitions, skills, and CLI tools so humans and agents can ship from one workflow.",
    code: "agelum move task-id doing",
  },
];

const useCases = [
  {
    title: "The Solo Builder",
    body: "Manage side projects with specs, tasks, and ideas in one local-first workspace.",
  },
  {
    title: "The Open Source Maintainer",
    body: "Track roadmap work, contributor notes, and implementation context in plain markdown.",
  },
  {
    title: "The AI-Augmented Dev",
    body: "Feed Claude CLI, OpenAI CLI, Ollama, LM Studio, and Cursor consistent context through skills and agent definitions.",
  },
];

const downloadPlans = [
  {
    title: "macOS",
    body: "Native desktop app with full local workspace support.",
  },
  {
    title: "Windows",
    body: "Run Agelum Notes with the same markdown-native workflow.",
  },
  {
    title: "Linux",
    body: "Built for developer environments and customizable setups.",
  },
];

export default function HomePage() {
  return (
    <main>
      <section className="hero section">
        <div className="container hero-grid">
          <div className="fade-in">
            <span className="eyebrow">
              <Sparkles size={14} />
              New release
            </span>
            <div className="brand-logo" aria-label="Agelum notes">
              <span className="brand-agelum">Agelum</span>
              <span className="brand-notes">notes</span>
            </div>
            <h1 className="hero-title">Your Code Deserves Better Notes</h1>
            <p className="hero-subtitle">
              The AI-ready project management tool that lives in your repo. Markdown-native and customizable for teams,
              solo builders, and AI-first workflows.
            </p>
            <div className="hero-ctas">
              <a className="btn btn-primary" href="#download">
                Download for Free <ArrowRight size={16} />
              </a>
            </div>
          </div>

          <div className="screenshot-frame fade-in delay-1" aria-label="Agelum Notes application screenshot">
            <Image
              src="/screenshoot.png"
              alt="Agelum Notes application screenshot"
              width={1200}
              height={760}
              className="screenshot-image"
              priority
            />
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container fade-in delay-1">
          <span className="eyebrow">
            <Blocks size={14} /> Why Agelum
          </span>
          <h2>From scattered notes to a single developer-native workflow</h2>
          <div className="bento-grid">
            {bentoCards.map((card) => (
              <article key={card.title} className={`card ${card.className}`}>
                <div className="card-visual">{card.visual}</div>
                <h3>{card.title}</h3>
                <p>{card.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container fade-in delay-2">
          <span className="eyebrow">
            <Command size={14} /> How It Works
          </span>
          <h2>Three steps from setup to shipping</h2>
          <div className="steps-grid">
            {steps.map((step) => (
              <article key={step.title} className="step">
                <step.icon size={18} />
                <h3>{step.title}</h3>
                <p>{step.body}</p>
                <span className="step-code">{step.code}</span>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container fade-in delay-2">
          <span className="eyebrow">
            <Bot size={14} /> Use Cases
          </span>
          <h2>Built for real developer workflows</h2>
          <div className="use-cases">
            {useCases.map((useCase) => (
              <article key={useCase.title} className="use-case">
                <h3>{useCase.title}</h3>
                <p>{useCase.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section" id="download">
        <div className="container fade-in delay-3">
          <span className="eyebrow">
            <Check size={14} /> Download
          </span>
          <h2>Start using Agelum Notes for free</h2>
          <div className="pricing-grid">
            {downloadPlans.map((plan) => (
              <article key={plan.title} className="plan">
                <h3>{plan.title}</h3>
                <p>{plan.body}</p>
                <a className="btn btn-primary download-btn" href="#">
                  Download for Free
                </a>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="final-cta fade-in delay-3">
            <h2>Stop Juggling Tools. Start Shipping.</h2>
            <p>
              Replace scattered docs and rigid PM tools with a markdown-native workspace. Customize your workflow,
              extend with plugins, and run everything from the Agelum CLI.
            </p>
            <div className="hero-ctas">
              <a className="btn btn-primary" href="#download">
                Download for Free
              </a>
            </div>
            <span className="trust">Free download • macOS • Windows • Linux</span>
          </div>
        </div>
      </section>
    </main>
  );
}
