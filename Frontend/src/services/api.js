import { API_AUTH_TOKEN, getApiBaseUrl, normalizeBaseUrl, PIPELINE_PATH } from "../utils/config"

/**
 * The backend exposes exactly one endpoint:
 *   POST {API_BASE_URL}/pipeline/code
 * Nothing else in this file may call another path.
 */

export const ERROR_KINDS = {
  network: "network",
  validation: "validation",
  request: "request",
  server: "server",
  unknown: "unknown",
  aborted: "aborted",
}

/** Normalized error shape consumed by the UI. */
function makeError({ kind, title, message, status = null, requestId = null, timestamp = null, details = [] }) {
  return { kind, title, message, status, requestId, timestamp, details }
}

/** Turn a FastAPI/Pydantic 422 body into readable field messages. */
function parseValidationDetail(body) {
  const detail = body?.detail

  if (Array.isArray(detail)) {
    return detail.map((item) => {
      const location = Array.isArray(item?.loc) ? item.loc.filter((part) => part !== "body").join(".") : ""
      const message = item?.msg || "Invalid value"
      return location ? `${location}: ${message}` : message
    })
  }

  if (typeof detail === "string") return [detail]
  return []
}

async function readJson(response) {
  const text = await response.text()
  if (!text) return null
  try {
    return JSON.parse(text)
  } catch {
    return { message: text.slice(0, 500) }
  }
}

/**
 * Send a request through the multi-agent pipeline.
 *
 * @param {string} userQuery
 * @param {string} userId
 * @param {{ baseUrl?: string, signal?: AbortSignal, timeoutMs?: number }} [options]
 * @returns {Promise<{ ok: boolean, data?: object, error?: object, status: number|null, durationMs: number }>}
 */
export async function sendPipelineRequest(userQuery, userId, options = {}) {
  const { baseUrl, signal, timeoutMs = 180000 } = options
  const base = normalizeBaseUrl(baseUrl) || getApiBaseUrl()
  const url = `${base}${PIPELINE_PATH}`
  const startedAt = performance.now()

  const controller = new AbortController()
  const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs)
  const onExternalAbort = () => controller.abort()
  if (signal) signal.addEventListener("abort", onExternalAbort, { once: true })

  let response

  try {
    response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...(API_AUTH_TOKEN ? { Authorization: `Bearer ${API_AUTH_TOKEN}` } : {}),
      },
      body: JSON.stringify({ user_query: userQuery, user_id: userId }),
      signal: controller.signal,
    })
  } catch (caught) {
    window.clearTimeout(timeoutId)
    if (signal) signal.removeEventListener("abort", onExternalAbort)

    const durationMs = performance.now() - startedAt

    if (signal?.aborted) {
      return {
        ok: false,
        status: null,
        durationMs,
        error: makeError({
          kind: ERROR_KINDS.aborted,
          title: "Request cancelled",
          message: "The request was cancelled before the pipeline returned a response.",
        }),
      }
    }

    const timedOut = caught?.name === "AbortError"

    return {
      ok: false,
      status: null,
      durationMs,
      error: makeError({
        kind: ERROR_KINDS.network,
        title: timedOut ? "Request timed out" : "Unable to reach the backend",
        message: timedOut
          ? "The pipeline did not respond in time. The multi-agent workflow may still be running on the server."
          : `Make sure the FastAPI server is running and reachable at ${base}.`,
        details: [`POST ${url}`],
      }),
    }
  } finally {
    window.clearTimeout(timeoutId)
    if (signal) signal.removeEventListener("abort", onExternalAbort)
  }

  const durationMs = performance.now() - startedAt
  const body = await readJson(response)
  const status = response.status

  if (response.ok) {
    const output = body?.data?.output
    if (typeof output !== "string" && output !== null && output !== undefined) {
      // Defensive: still surface it, stringified, rather than crashing.
      return {
        ok: true,
        status,
        durationMs,
        data: {
          ...body,
          data: { ...body.data, output: JSON.stringify(body.data.output, null, 2) },
        },
      }
    }

    return { ok: true, status, durationMs, data: body || {} }
  }

  const requestId = body?.request_id ?? null
  const backendTimestamp = body?.error?.timestamp ?? body?.data?.timestamp ?? null
  const backendMessage = body?.error?.error || body?.message || null

  if (status === 422) {
    const details = parseValidationDetail(body)
    return {
      ok: false,
      status,
      durationMs,
      error: makeError({
        kind: ERROR_KINDS.validation,
        title: "Invalid Request",
        message:
          "The backend rejected the request because required fields are missing or invalid. Both a query and a user ID must be present.",
        status,
        requestId,
        timestamp: backendTimestamp,
        details,
      }),
    }
  }

  if (status === 400) {
    return {
      ok: false,
      status,
      durationMs,
      error: makeError({
        kind: ERROR_KINDS.request,
        title: "Request Processing Failed",
        message: backendMessage || "The backend could not process this request.",
        status,
        requestId,
        timestamp: backendTimestamp,
      }),
    }
  }

  if (status >= 500) {
    return {
      ok: false,
      status,
      durationMs,
      error: makeError({
        kind: ERROR_KINDS.server,
        title: "Pipeline Failed",
        message: backendMessage || "The multi-agent pipeline failed while processing this request.",
        status,
        requestId,
        timestamp: backendTimestamp,
      }),
    }
  }

  return {
    ok: false,
    status,
    durationMs,
    error: makeError({
      kind: ERROR_KINDS.unknown,
      title: `Unexpected response (${status})`,
      message: backendMessage || "The backend returned a response the client did not expect.",
      status,
      requestId,
      timestamp: backendTimestamp,
    }),
  }
}
