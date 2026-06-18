import { NextResponse } from "next/server";

export function getContentLength(request: Request) {
  const value = request.headers.get("content-length");

  if (!value) return null;

  const length = Number(value);

  return Number.isFinite(length) && length >= 0 ? length : null;
}

export function assertContentLength(request: Request, maxBytes: number) {
  const contentLength = getContentLength(request);

  if (contentLength !== null && contentLength > maxBytes) {
    return NextResponse.json(
      { error: "İstek boyutu izin verilen sınırı aşıyor." },
      { status: 413 }
    );
  }

  return null;
}

export async function readJsonBody<T>(
  request: Request,
  maxBytes: number
): Promise<
  | {
      ok: true;
      data: T;
    }
  | {
      ok: false;
      response: NextResponse;
    }
> {
  const contentType = request.headers.get("content-type") || "";

  if (!contentType.toLowerCase().includes("application/json")) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Geçerli JSON isteği gerekli." },
        { status: 415 }
      ),
    };
  }

  const lengthError = assertContentLength(request, maxBytes);

  if (lengthError) {
    return {
      ok: false,
      response: lengthError,
    };
  }

  const text = await request.text().catch(() => null);

  if (text === null) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "İstek gövdesi okunamadı." },
        { status: 400 }
      ),
    };
  }

  if (new TextEncoder().encode(text).length > maxBytes) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "İstek boyutu izin verilen sınırı aşıyor." },
        { status: 413 }
      ),
    };
  }

  try {
    return {
      ok: true,
      data: JSON.parse(text) as T,
    };
  } catch {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "JSON biçimi geçersiz." },
        { status: 400 }
      ),
    };
  }
}
