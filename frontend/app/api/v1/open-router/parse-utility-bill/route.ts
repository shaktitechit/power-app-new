import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

const backendUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://backend:5000";

export async function POST(request: NextRequest) {
  const targetUrl = `${backendUrl}/api/v1/open-router/parse-utility-bill`;
  const formData = await request.formData();
  const cookie = request.headers.get("cookie") ?? "";

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5 * 60 * 1000);

  try {
    const backendResponse = await fetch(targetUrl, {
      method: "POST",
      body: formData,
      headers: cookie ? { cookie } : undefined,
      signal: controller.signal,
    });

    const body = await backendResponse.text();
    const contentType =
      backendResponse.headers.get("content-type") ?? "application/json";

    return new NextResponse(body, {
      status: backendResponse.status,
      headers: {
        "content-type": contentType,
        ...(backendResponse.headers.get("x-document-warnings")
          ? {
              "x-document-warnings": backendResponse.headers.get(
                "x-document-warnings",
              )!,
            }
          : {}),
      },
    });
  } catch (error) {
    const message =
      error instanceof Error && error.name === "AbortError"
        ? "Bill analysis timed out. Try a smaller or clearer PDF."
        : "Bill analysis failed while contacting the server.";

    return NextResponse.json({ message }, { status: 504 });
  } finally {
    clearTimeout(timeoutId);
  }
}
