import { NextResponse } from "next/server";
import { z } from "zod";

export class ForbiddenError extends Error {
  constructor(message = "Forbidden") {
    super(message);
    this.name = "ForbiddenError";
  }
}

export class NotFoundError extends Error {
  constructor(message = "Not found") {
    super(message);
    this.name = "NotFoundError";
  }
}

export class BadRequestError extends Error {
  constructor(message = "Bad request") {
    super(message);
    this.name = "BadRequestError";
  }
}

export class TooManyRequestsError extends Error {
  constructor(message = "Too many requests") {
    super(message);
    this.name = "TooManyRequestsError";
  }
}

export function safeErrorResponse(error: unknown, fallback = "Internal server error") {
  if (error instanceof z.ZodError) {
    return NextResponse.json(error.flatten(), { status: 400 });
  }

  if (error instanceof BadRequestError) {
    return NextResponse.json({ message: error.message }, { status: 400 });
  }

  if (error instanceof ForbiddenError) {
    return NextResponse.json({ message: error.message }, { status: 403 });
  }

  if (error instanceof NotFoundError) {
    return NextResponse.json({ message: error.message }, { status: 404 });
  }

  if (error instanceof TooManyRequestsError) {
    return NextResponse.json({ message: error.message }, { status: 429 });
  }

  return NextResponse.json({ message: fallback }, { status: 500 });
}

export function isInternalPath(path: string | undefined): path is string {
  return !!path && path.startsWith("/") && !path.startsWith("//");
}
