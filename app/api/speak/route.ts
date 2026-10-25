import { NextResponse } from 'next/server';

// VEGA's voice.
//
// Deliberately a separate route from /api/chat rather than an extra field on
// it. The answer is already on screen by the time audio is ready, so making
// the text wait on a speech synthesis round-trip would make every reply feel
// slower to everyone — including the people who never turn the voice on.
// The panel renders the reply, then asks for the audio.
//
// It speaks text, it does not generate it. Nothing here reaches the RAG
// index or the grounding prompt; /api/chat remains the only thing that
// decides what VEGA says.

export const maxDuration = 30;

// A spoken reply is 2-4 sentences by the chat prompt's own instruction. The
// cap is well above that and exists because this route costs money per
// character — it is a budget guard, not a formatting rule.
const MAX_CHARS = 1200;

const MODEL = process.env.GEMINI_TTS_MODEL?.trim() || 'gemini-3.8-flash-tts';
const VOICE = process.env.GEMINI_TTS_VOICE?.trim() || 'Kore';

export async function POST(req: Request) {
  const key =
    process.env.GEMINI_API_KEY?.trim() ||
    process.env.GOOGLE_GENERATIVE_AI_API_KEY?.trim();
  // 503 rather than 500: the voice is absent, not broken. The panel treats
  // this as "no audio available" and stays silent instead of showing an error.
  if (!key) return NextResponse.json({ error: 'No voice configured.' }, { status: 503 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }

  const raw = typeof (body as { text?: unknown })?.text === 'string'
    ? (body as { text: string }).text.trim()
    : '';
  if (!raw) return NextResponse.json({ error: 'Nothing to speak.' }, { status: 400 });

  const text = raw.slice(0, MAX_CHARS);

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`,
      {
        method: 'POST',
        headers: { 'x-goog-api-key': key, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text }] }],
          generationConfig: {
            responseModalities: ['AUDIO'],
            speechConfig: {
              voiceConfig: { prebuiltVoiceConfig: { voiceName: VOICE } },
            },
          },
        }),
        signal: AbortSignal.timeout(25000),
      },
    );

    if (!response.ok) {
      // Logged with the status, unlike the chat provider's bare catch — a
      // 404 (retired model), a 403 (revoked key) and a 429 (rate limit) are
      // three different problems and the log is the only place they differ.
      console.warn(`Speak: HTTP ${response.status} from ${MODEL}`);
      return NextResponse.json({ error: 'Voice unavailable.' }, { status: 502 });
    }

    const data = await response.json();
    const part = data?.candidates?.[0]?.content?.parts?.[0];
    const inline = part?.inlineData ?? part?.inline_data;
    const encoded: unknown = inline?.data;
    if (typeof encoded !== 'string') {
      console.warn('Speak: response carried no audio part.');
      return NextResponse.json({ error: 'Voice unavailable.' }, { status: 502 });
    }

    // Returned as bytes rather than the base64 JSON Gemini hands back: the
    // panel plays it through an <audio> src, and a blob of wav is a third
    // smaller over the wire than the same wav as base64 text.
    const audio = Buffer.from(encoded, 'base64');
    return new NextResponse(new Uint8Array(audio), {
      headers: {
        'Content-Type': inline?.mimeType ?? inline?.mime_type ?? 'audio/wav',
        'Content-Length': String(audio.byteLength),
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.warn('Speak: request failed —', (error as Error).message);
    return NextResponse.json({ error: 'Voice unavailable.' }, { status: 502 });
  }
}
