import { NextResponse } from "next/server";

type ErrorDetails = Record<string, unknown> | undefined;

/**
 * Request body encodings readJsonBody understands, advertised on every JSON
 * response with Accept-Encoding (RFC 7694). Clients compress uploads only
 * after seeing it, so older clients and servers keep working unchanged.
 */
const ACCEPTED_ENCODINGS = "gzip";

function withAcceptedEncodings(headers?: HeadersInit): Headers {
    const merged = new Headers(headers);
    merged.set("accept-encoding", ACCEPTED_ENCODINGS);
    return merged;
}

export function success<T>(data: T, status = 200, headers?: HeadersInit) {
    return NextResponse.json(
        { ok: true, data },
        { status, headers: withAcceptedEncodings(headers) }
    );
}

export function failure(
    code: string,
    message: string,
    status: number,
    details?: ErrorDetails
) {
    return NextResponse.json(
        {
            ok: false,
            error: {
                code,
                message,
                ...(details ? { details } : {}),
            },
        },
        { status, headers: withAcceptedEncodings() }
    );
}

/** Sentinel returned when a request body exceeds the configured size cap. */
export const PAYLOAD_TOO_LARGE = Symbol("payload_too_large");

/** Thrown for a Content-Encoding readJsonBody cannot decode; answered with 415. */
class UnsupportedEncodingError extends Error {
    constructor(readonly encoding: string) {
        super(`Unsupported Content-Encoding: ${encoding}`);
    }
}

/**
 * Reads and JSON-parses a request body, rejecting anything larger than
 * `maxBytes`. The Content-Length header is checked first as a fast path, then
 * the body is streamed with a running byte count so a missing or lying header
 * cannot smuggle an oversized payload past the cap. Returns null on malformed
 * JSON and the PAYLOAD_TOO_LARGE sentinel when the limit is exceeded.
 *
 * Gzip-encoded bodies are decompressed as they stream in, and the cap applies
 * to the decompressed bytes, so a small compressed body cannot expand past it.
 */
export async function readJsonBody(
    request: Request,
    maxBytes = Number.POSITIVE_INFINITY
): Promise<unknown | typeof PAYLOAD_TOO_LARGE> {
    const encoding = (request.headers.get("content-encoding") ?? "identity")
        .trim()
        .toLowerCase();
    if (encoding !== "identity" && encoding !== "gzip") {
        throw new UnsupportedEncodingError(encoding);
    }

    // For an identity body this is the payload size; a compressed one is
    // smaller than what it decodes to, so the check stays a valid lower bound.
    const declared = Number(request.headers.get("content-length"));
    if (Number.isFinite(declared) && declared > maxBytes) {
        return PAYLOAD_TOO_LARGE;
    }

    if (!request.body) {
        return null;
    }
    if (encoding === "identity" && maxBytes === Number.POSITIVE_INFINITY) {
        try {
            return (await request.json()) as unknown;
        } catch {
            return null;
        }
    }

    const stream =
        encoding === "gzip"
            ? request.body.pipeThrough(new DecompressionStream("gzip"))
            : request.body;
    const reader = stream.getReader();
    const chunks: Uint8Array[] = [];
    let total = 0;
    try {
        for (;;) {
            const { done, value } = await reader.read();
            if (done) break;
            if (value) {
                total += value.byteLength;
                if (total > maxBytes) {
                    await reader.cancel().catch(() => {});
                    return PAYLOAD_TOO_LARGE;
                }
                chunks.push(value);
            }
        }
    } catch {
        // A truncated or corrupt body, compressed or not.
        return null;
    }

    try {
        const buffer = new Uint8Array(total);
        let offset = 0;
        for (const chunk of chunks) {
            buffer.set(chunk, offset);
            offset += chunk.byteLength;
        }
        return JSON.parse(new TextDecoder().decode(buffer)) as unknown;
    } catch {
        return null;
    }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function routeHandler<T extends (...args: any[]) => Promise<Response>>(fn: T): T {
    return (async (...args: Parameters<T>) => {
        try {
            return await fn(...args);
        } catch (err) {
            if (err instanceof UnsupportedEncodingError) {
                return failure("unsupported_encoding", err.message, 415);
            }
            console.error("[API Error]", err);
            return failure("internal_error", "An unexpected error occurred.", 500);
        }
    }) as T;
}
