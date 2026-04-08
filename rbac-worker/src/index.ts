import { DurableObject } from 'cloudflare:workers';
import { Hono } from 'hono';
import { sign, verify } from 'hono/jwt';
import { createMiddleware } from 'hono/factory';
import { ingestRoutes } from './routes/ingest.routes';
import { compare, hash } from 'bcryptjs';
import { cors } from 'hono/cors';
import { roleRoutes } from './routes/role.routes';
import { authRoutes } from './routes/auth.routes';
import { adminRoutes } from './routes/admin.routes';
import { searchRoutes } from './routes/search.routes';
import { conversationApp } from './routes/conversation.routes';
// /**
//  * Welcome to Cloudflare Workers! This is your first Durable Objects application.
//  *
//  * - Run `npm run dev` in your terminal to start a development server
//  * - Open a browser tab at http://localhost:8787/ to see your Durable Object in action
//  * - Run `npm run deploy` to publish your application
//  *
//  * Bind resources to your worker in `wrangler.jsonc`. After adding bindings, a type definition for the
//  * `Env` object can be regenerated with `npm run cf-typegen`.
//  *
//  * Learn more at https://developers.cloudflare.com/durable-objects
//  */

// /** A Durable Object's behavior is defined in an exported Javascript class */
// export class MyDurableObject extends DurableObject<Env> {
// 	/**
// 	 * The constructor is invoked once upon creation of the Durable Object, i.e. the first call to
// 	 * 	`DurableObjectStub::get` for a given identifier (no-op constructors can be omitted)
// 	 *
// 	 * @param ctx - The interface for interacting with Durable Object state
// 	 * @param env - The interface to reference bindings declared in wrangler.jsonc
// 	 */
// 	constructor(ctx: DurableObjectState, env: Env) {
// 		super(ctx, env);
// 	}

// 	/**
// 	 * The Durable Object exposes an RPC method sayHello which will be invoked when a Durable
// 	 *  Object instance receives a request from a Worker via the same method invocation on the stub
// 	 *
// 	 * @param name - The name provided to a Durable Object instance from a Worker
// 	 * @returns The greeting to be sent back to the Worker
// 	 */
// 	async sayHello(name: string): Promise<string> {
// 		return `Hello, ${name}!`;
// 	}
// }

// export default {
// 	/**
// 	 * This is the standard fetch handler for a Cloudflare Worker
// 	 *
// 	 * @param request - The request submitted to the Worker from the client
// 	 * @param env - The interface to reference bindings declared in wrangler.jsonc
// 	 * @param ctx - The execution context of the Worker
// 	 * @returns The response to be sent back to the client
// 	 */
// 	async fetch(request, env, ctx): Promise<Response> {
// 		// Create a stub to open a communication channel with the Durable Object
// 		// instance named "foo".
// 		//
// 		// Requests from all Workers to the Durable Object instance named "foo"
// 		// will go to a single remote Durable Object instance.
// 		const stub = env.MY_DURABLE_OBJECT.getByName('foo');

// 		// Call the `sayHello()` RPC method on the stub to invoke the method on
// 		// the remote Durable Object instance.
// 		const greeting = await stub.sayHello('world');

// 		return new Response(greeting);
// 	},
// } satisfies ExportedHandler<Env>;

// Định nghĩa kiểu dữ liệu cho môi trường (Bindings)
export type Bindings = {
	DB: D1Database;
	JWT_SECRET: string;
	EMBEDDING_SVC: Fetcher;
	VECTOR_INDEX: VectorizeIndex;
	AI: any;
	UPSTASH_REDIS_REST_URL: string;
	UPSTASH_REDIS_REST_TOKEN: string;
};
export type Variables = {
	user: {
		sub: string | number;
		role: string;
		email: string;
	};
};
const app = new Hono<{ Bindings: Bindings; Variables: Variables }>();

app.use(
	'*',
	cors({
		origin: (origin) => origin,
		allowMethods: ['POST', 'GET', 'OPTIONS'],
		allowHeaders: ['Content-Type', 'Authorization'],
	}),
);

app.route('/search', searchRoutes);
app.route('/', authRoutes);
app.route('/roles', roleRoutes);
app.route('/admin', adminRoutes);
app.route('/ingest', ingestRoutes);
app.route('/conversations', conversationApp);
export default {
	fetch: app.fetch,
};
