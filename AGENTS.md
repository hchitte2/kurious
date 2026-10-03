# AGENTS.md

**Load the `deepspace` skill before working in this repo.** It is the source
of truth for the SDK; read project source afterward for repo-specific details.

The scaffold installs the portable skill at
`.agents/skills/deepspace/SKILL.md`. Restart the agent session to load newly
installed skills, or read that file directly. If it is missing, scaffold-time
installation failed (typically a network issue); reinstall:

```sh
npx -y skills@latest add deepdotspace/deepspace-skill -y                 # this project
npx -y skills@latest add deepdotspace/deepspace-skill -g -y              # globally, every project
npx -y skills@latest add deepdotspace/deepspace-skill --agent codex -y   # specific agent
```

If installation is unavailable, read
<https://github.com/deepdotspace/deepspace-skill/blob/main/skills/deepspace/SKILL.md>.

## About this project

This is a **DeepSpace** app — a real-time collaborative app built on the
[`deepspace`](https://www.npmjs.com/package/deepspace) SDK and deployed to
Cloudflare Workers via `npx deepspace deploy`.

## Version control

**This app's source is GitHub (`hchitte2/kurious`), latched permanently on the first
deploy.** DeepSpace source verbs (`push`, `pull`, `clone`, `workspace`) refuse with
`source_managed_by_github`; never run them. Deploys ship the local working tree, dirty bytes
included, so commit (and push to GitHub) before every deploy. See CLAUDE.md for the
project rules; they take precedence over the generic scaffold guidance in this file.

## Project commands

```sh
npx deepspace auth login   # authenticate with app.space
npx deepspace dev start    # local dev server (vite + miniflare)
npx deepspace deploy       # deploy to <app>.app.space
npx deepspace add --list   # list optional features (messaging, etc.)
npx deepspace add <feature>
```

This starter does not register local agent tool routes by default. To expose
the app's tools to a local assistant, add
`registerAgent(app, { tools: buildTools, inApp: false })` in `worker.ts`
(imports from `src/ai/agent.ts` and `src/ai/tools.ts`) and deploy. After that,
`npx deepspace agent tools <app> --json` discovers the tools and their input
schemas, and `npx deepspace agent invoke <app> <tool> --input-file input.json
--json` runs one — always run `agent tools` first and follow the returned
schema rather than guessing arguments. Both reuse the current CLI login. If
they report `not_authenticated`, run the refusal's action when present. In a
headless shell without an action, run `npx deepspace auth login --help` and use
the operator-supplied credential path it names; never invent credentials or put
a password on the command line.
