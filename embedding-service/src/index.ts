/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npm run deploy` to publish your worker
 *
 * Bind resources to your worker in `wrangler.jsonc`. After adding bindings, a type definition for the
 * `Env` object can be regenerated with `npm run cf-typegen`.
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

interface RequestBody {
	text?: string;
}

interface AIResponse {
	shape?: number[];
	data?: number[][];
	pooling?: 'mean' | 'cls';
	request_id?: string;
}

export default {
	async fetch(request, env): Promise<Response> {
		if (request.method === 'GET') {
			return new Response('Use POST with JSON body containing "text" field', { status: 400 });
		}

		let text: string;
		try {
			const body: RequestBody = await request.json();
			text = body.text || '';
		} catch {
			return new Response('Invalid JSON in request body', { status: 400 });
		}

		if (!text) return new Response('Missing text', { status: 400 });

		const response: AIResponse = await env.AI.run('@cf/baai/bge-small-en-v1.5', {
			text: [text],
		});

		if (!response.data || response.data.length === 0) {
			return new Response('Failed to generate embedding', { status: 500 });
		}

		return new Response(JSON.stringify({ vector: response.data[0] }), {
			headers: { 'content-type': 'application/json' },
		});
	},
} satisfies ExportedHandler<Env>;
