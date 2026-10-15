import { NextResponse } from "next/server";
import { ZodError, ZodTypeAny, z } from "zod";
import { Prisma } from "@prisma/client";

/** Error thrown inside route handlers to send a specific HTTP status. */
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
    public fields?: Record<string, string>,
  ) {
    super(message);
  }
}

export function ok<T>(data: T, status = 200) {
  return NextResponse.json(data, { status });
}

/** Parse and validate a JSON request body with a zod schema. */
export async function parseBody<S extends ZodTypeAny>(req: Request, schema: S): Promise<z.output<S>> {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    throw new HttpError(400, "Request body must be valid JSON");
  }
  const result = schema.safeParse(json);
  if (!result.success) throw result.error;
  return result.data;
}

export function parseId(value: string): number {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) throw new HttpError(400, "Invalid id");
  return id;
}

/**
 * Wrap a route handler so every error becomes a friendly JSON response:
 *   { error: "message", fields?: { fieldName: "message" } }
 */
export function handler<A extends unknown[]>(fn: (...args: A) => Promise<Response>) {
  return async (...args: A): Promise<Response> => {
    try {
      return await fn(...args);
    } catch (err) {
      if (err instanceof ZodError) {
        const fields: Record<string, string> = {};
        for (const issue of err.issues) {
          const key = issue.path.join(".") || "form";
          if (!fields[key]) fields[key] = issue.message;
        }
        return NextResponse.json(
          { error: Object.values(fields)[0] ?? "Validation failed", fields },
          { status: 422 },
        );
      }
      if (err instanceof HttpError) {
        return NextResponse.json({ error: err.message, fields: err.fields }, { status: err.status });
      }
      if (err instanceof Prisma.PrismaClientKnownRequestError) {
        if (err.code === "P2025") return NextResponse.json({ error: "Item not found" }, { status: 404 });
        if (err.code === "P2002")
          return NextResponse.json({ error: "That already exists — try a different name" }, { status: 409 });
      }
      console.error("[api]", err);
      return NextResponse.json({ error: "Something went wrong on the server" }, { status: 500 });
    }
  };
}

type Ctx = { params: { id: string } };
export type { Ctx as IdContext };
