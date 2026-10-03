#!/usr/bin/env node
// PreToolUse guard: never read/print secrets, never run DeepSpace verbs that
// GitHub-source apps forbid or that change ownership. Exit 2 = block (stderr goes to Claude).
let raw = ''
process.stdin.on('data', (c) => (raw += c))
process.stdin.on('end', () => {
  let input = {}
  try { input = JSON.parse(raw || '{}') } catch { process.exit(0) }
  const tool = input.tool_name ?? ''
  const ti = input.tool_input ?? {}
  const block = (why) => { process.stderr.write(`Blocked by secrets guard: ${why}\n`); process.exit(2) }

  const SECRET_FILE = /(^|[\/\s"'=])\.(dev\.vars|env)(\.[\w.-]+)?(?=$|[\s"'\/;|&)])/
  const isExample = (s) => /\.env\.example\b/.test(s)

  if (tool === 'Bash') {
    const cmd = String(ti.command ?? '')
    if (/\bdeepspace\s+(push|pull|clone|workspace)\b/.test(cmd))
      block('this app is GitHub-sourced; DeepSpace source verbs (push/pull/clone/workspace) are forbidden.')
    if (/\bdeepspace\s+app\s+(undeploy|transfer|collaborators)\b/.test(cmd))
      block('app undeploy/transfer/collaborators need the human to ask for them explicitly.')
    if (/^\s*(printenv|env)\s*$/.test(cmd) || /\bprintenv\b/.test(cmd))
      block('dumping the environment can print tokens.')
    if (SECRET_FILE.test(cmd) && !isExample(cmd) && !/^\s*git\s+(check-ignore|status|ls-files)\b/.test(cmd))
      block('commands may not touch .dev.vars or .env files (secrets). Use `deepspace secrets` instead.')
    process.exit(0)
  }

  if (['Read', 'Edit', 'Write', 'MultiEdit', 'NotebookEdit', 'Grep', 'Glob'].includes(tool)) {
    const paths = [ti.file_path, ti.path, ti.notebook_path, ti.glob, ti.pattern && tool === 'Glob' ? ti.pattern : undefined]
      .filter((p) => typeof p === 'string')
    for (const p of paths) {
      const base = p.split('/').pop() ?? ''
      if (/^\.(dev\.vars|env)/.test(base) && !isExample(base))
        block(`${tool} on ${base} is not allowed (secrets).`)
    }
  }
  process.exit(0)
})
