// vitest.config.ts
import { defineWorkersConfig } from '@cloudflare/vitest-pool-workers/config';

export default defineWorkersConfig({
	test: {
		server: {
			deps: {
				inline: ['@langchain/core', '@langchain/textsplitters', 'langsmith'],
			},
		},
		poolOptions: {
			workers: {
				wrangler: { configPath: './wrangler.jsonc' },
				miniflare: {
					// Add mock configurations for any bindings you use
					bindings: {
						JWT_SECRET: 'test-secret',
						UPSTASH_REDIS_REST_URL: 'https://test-redis.upstash.io',
						UPSTASH_REDIS_REST_TOKEN: 'test-token',
					},
					// Explicitly declare your D1 Database binding
					d1Databases: ['DB'],
					serviceBindings: {
						EMBEDDING_SVC: () => {
							return new Response(JSON.stringify({ vector: [0.1, 0.2, 0.3] }), {
								status: 200,
								headers: { 'Content-Type': 'application/json' },
							});
						},
					},
					// Vectorize isn't fully mocked by default in Miniflare,
					// so we can provide a dummy fetcher or dummy binding name
				},
			},
		},
	},
});
