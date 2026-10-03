/**
 * Kurious exposes ONE assistant surface: the local assistant (the user's
 * Codex, Claude, or similar client), reached through the DeepSpace CLI
 * (`npx deepspace agent tools|invoke kurious`). The CLI only bridges the
 * agent to these Worker routes; it does not authorize or host it.
 *
 * Kurious has no website AI chat (no `ai-chats` schema), so the scaffold's
 * in-app surface is not wired here. Its tools need the verified caller and
 * the request's env (src/ai/tools.ts), which the SDK's tool factory signature
 * does not carry, so the SDK routes are mounted per request with both bound.
 */

import { Hono } from 'hono'
import type { Context } from 'hono'
import { registerAgentToolRoutes, resolveAppMembership } from 'deepspace/worker'
import type { AgentToolAccessResult, JwtClaims } from 'deepspace/worker'
import type { ToolSet } from 'ai'
import type { ToolCaller, ToolExecutor } from './tools.js'
import { resolveAgentAuth } from '../server/http-routes.js'
import type { AppContext, Env } from '../../worker.js'

type ToolFactory = (executor: ToolExecutor, caller: ToolCaller) => ToolSet
type ResolveAccess = (request: Request, env: Env) => Promise<AgentToolAccessResult>

/** The SDK-owned local agent paths (discovery + invoke). */
const AGENT_PATH = '/_deepspace/agent'

export interface AgentAuthorizationContext {
  userId: string
  claims: JwtClaims
  request: Request
  env: Env
}

export interface RegisterAgentOptions {
  /** The app-owned tool factory from src/ai/tools.ts. */
  tools: ToolFactory
  /**
   * The website AI chat. Kurious has none: only `false` is accepted, so
   * turning it on means wiring src/ai/chat-routes.ts here first.
   */
  inApp?: false
  /** Enable the user's local Codex/Claude/etc. assistant. Defaults to true. */
  local?: boolean
  /**
   * Optional app-specific gate for subscriptions, teams, roles, or app data.
   * It only narrows access after verified identity and app membership succeed.
   */
  authorize?: (context: AgentAuthorizationContext) => boolean | Promise<boolean>
}

function createAccessResolver(options: RegisterAgentOptions, resolveIdentity: typeof resolveAgentAuth): ResolveAccess {
  return async (request, env) => {
    const auth = await resolveIdentity(request, env)
    if (!auth) return { ok: false, status: 401 }

    // Membership has exactly one definition — the caller's row in this app's
    // canonical users collection (the owner is always a member). It is the
    // same primitive that gates the admin and realtime routes. A membership
    // read that could not complete is 503 (retryable), never 403: a transient
    // room failure must not present as a permission denial.
    const membership = await resolveAppMembership(env, auth.userId, request.signal)
    if (!membership) return { ok: false, status: 503 }
    if (!membership.member) return { ok: false, status: 403 }

    if (options.authorize) {
      try {
        if (
          !(await options.authorize({ userId: auth.userId, claims: auth.claims, request, env }))
        ) {
          return { ok: false, status: 403 }
        }
      } catch {
        // The callback failed rather than denied — fail closed but retryable.
        return { ok: false, status: 503 }
      }
    }

    return { ok: true, auth }
  }
}

/**
 * The SDK's local agent routes for ONE request. The SDK calls `resolveAccess`
 * and then the tool factory within the same request; binding the verified
 * caller in this request's own closure keeps concurrent requests apart.
 */
function callerScopedToolRoutes(tools: ToolFactory, resolveAccess: ResolveAccess): Hono<AppContext> {
  const routes = new Hono<AppContext>()
  let caller: ToolCaller | null = null
  registerAgentToolRoutes(routes, {
    resolveAccess: async (request, env) => {
      const access = await resolveAccess(request, env)
      caller = access.ok ? { env, userId: access.auth.userId } : null
      return access
    },
    buildTools: (executor) => {
      // Unreachable: the SDK only builds tools after access succeeded. Fail closed.
      if (!caller) throw new Error('agent tools requested before the caller was verified')
      return tools(executor, caller)
    },
  })
  return routes
}

/**
 * Register the local assistant's tool routes. Call once in worker.ts, with
 * the other API routes and before the platform proxy's `/_deepspace/*`.
 */
export function registerAgent(app: Hono<AppContext>, options: RegisterAgentOptions): void {
  if (options.local === false) return
  const resolveAccess = createAccessResolver(options, resolveAgentAuth)
  const handle = (c: Context<AppContext>) =>
    callerScopedToolRoutes(options.tools, resolveAccess).fetch(c.req.raw, c.env, c.executionCtx)
  app.all(AGENT_PATH, handle)
  app.all(`${AGENT_PATH}/*`, handle)
}
