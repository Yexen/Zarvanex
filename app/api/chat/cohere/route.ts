import { NextRequest } from 'next/server';
import { sendCohereMessage } from '@/lib/cohere';

export const runtime = 'nodejs';

const encoder = new TextEncoder();

export async function POST(request: NextRequest) {
  try {
    const { messages, modelId } = await request.json();
    const apiKey = process.env.COHERE_API_KEY;

    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'Cohere API key not configured' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Create a streaming response
    const stream = new ReadableStream({
      async start(controller) {
        try {
          await sendCohereMessage(messages, modelId, apiKey, (chunk: string) => {
            const data = `data: ${JSON.stringify({ content: chunk })}\n\n`;
            controller.enqueue(encoder.encode(data));
          });

          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        } catch (error) {
          console.error('Cohere streaming error:', error);
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ error: errorMessage })}\n\n`)
          );
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Cohere API route error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to process request' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
