import { NextResponse } from "next/server";
import https from "https";

const API_URL = process.env.CHAT_API_URL || "https://localhost:44309/api/Chat";

let sessionCounter = 0;

function postToBackend(payload: object): Promise<any> {
  return new Promise((resolve, reject) => {
    const url = new URL(API_URL);
    const data = JSON.stringify(payload);

    const options: https.RequestOptions = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(data),
      },
      rejectUnauthorized: false,
    };

    const req = https.request(options, (res) => {
      let body = "";
      res.on("data", (chunk) => (body += chunk));
      res.on("end", () => {
        try {
          resolve(JSON.parse(body));
        } catch {
          reject(new Error("Invalid JSON response"));
        }
      });
    });

    req.on("error", reject);
    req.write(data);
    req.end();
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { message } = body;

    if (!message || typeof message !== "string") {
      return NextResponse.json(
        { success: false, error: "Message is required" },
        { status: 400 }
      );
    }

    sessionCounter++;

    const data = await postToBackend({
      message,
      sessionId: String(sessionCounter),
      topK: 5,
    });

    return NextResponse.json(data);
  } catch (error) {
    console.error("[chat] API error:", error);

    return NextResponse.json({
      answer:
        "I apologize, but I'm currently unable to connect to the Sponsored Projects knowledge base. Please try again later or visit [unr.edu/sponsored-projects](https://www.unr.edu/sponsored-projects) for direct assistance.",
      citations: [],
      suggestedQuestions: [
        "What is a sponsored project?",
        "How do I develop my budget?",
        "What is the pre-award process?",
        "How does post-award management work?",
      ],
      success: false,
      error: "API connection failed",
      chunksRetrieved: 0,
      responseTimeMs: 0,
    });
  }
}
