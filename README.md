# AuraRBAC: An enterprise chatbot with Role-Based Access Control
## 1. Description:
A modern **Role-Based Access Control (RBAC)** system with **Retrieval Augmented Generation (RAG)** capabilities, built for secure knowledge management and AI-powered conversations with federated access control.
Website:  https://rbac-rag.pages.dev/
## 2. Key features
### Authentication & Authorization
- JWT-based token authentication
- Role-based access control
- Rate limiting middleware
- Secure password hashing with bcryptjs

### Knowledge Management
- Document ingestion pipeline
- LangChain text splitting for optimal chunking
- Vector embeddings with Cloudflare BAAI general embedding
- Redis-backed vector store (Upstash)
- Hybrid search capabilities

### Conversation Engine
- Real-time chat interface
- Context-aware responses with RAG
- Conversation history management
- Streaming support

### Admin Features
- User and role management
- Access audit logs
- Assign users and documents to the right groups 
## 3. Architecture
```
RBAC/
├── rbac-worker/                 # Backend API (Hono + Wrangler)
│   ├── src/
│   │   ├── controllers/         # Business logic
│   │   ├── routes/              # API endpoints
│   │   ├── services/            # External service integrations
│   │   ├── middleware/          # Auth, rate limiting, admin checks  
│   ├── wrangler.jsonc           # Cloudflare configuration
│   └── package.json
│
├── rbac-frontend/rbac-frontend/ # Frontend (Next.js)
│   ├── src/
│   │   ├── app/                 # Next.js app router
│   │   ├── components/          # React components
│   │   ├── api/proxy/           # API proxy routes
│   │   └── middleware.ts        # JWT middleware
│   ├── next.config.ts
│   └── package.json
│
├── embedding-service/           # Embedding Worker
│   ├── src/
│   │   └── index.ts
│   ├── wrangler.jsonc
│   └── package.json
│
└── README.md
```
## 4. Tech stack
+ Frontend: Next.js + React
+ Language: TypeScript
+ Backend: Hono + Cloudflare Workers
+ Database: D1 SQL Database + Upstash Redis
+ AI model: Meta Llama 3.1
+ Infrastructure: Cloudflare Workers, Upstash Redis (Caching).

## 5. Access the application
### Web demo: https://rbac-rag.pages.dev/
+ Gmail: intern@frensai.com
+ Password: 123456
### Local:
### Prerequisites
- Node.js 18+ 
- Yarn 4.9.1
- Wrangler CLI: `npm install -g wrangler`

### Environment Variables
**rbac-worker/.dev.vars**
```env
JWT_SECRET=your-secret-key
UPSTASH_REDIS_REST_URL=...
UPSTASH_REDIS_REST_TOKEN=...
```

**rbac-frontend/.env.local**
```env
JWT_SECRET=your-secret-key
BACKEND_LOCAL_URL=your-wrangler-backend-url
```

### Setup Steps

1. **Clone the repository**
```bash
git clone https://github.com/TungAnhDep/RBAC-RAG.git
cd rbac
```

2. **Install dependencies**
```bash
# Backend
cd rbac-worker
yarn install
cd ../

# Frontend
cd rbac-frontend/rbac-frontend
yarn install
cd ../../

# Embedding Service
cd embedding-service
yarn install
cd ../
```

3. **Start development servers**
```bash
# Terminal 1: Backend Worker
cd rbac-worker
yarn dev

# Terminal 2: Frontend
cd rbac-frontend/rbac-frontend
yarn dev

# Terminal 3: Embedding Service (optional)
cd embedding-service
yarn dev
```
4. **Create database**
```bash
npx wrangler d1 execute <db-name> --file=./schema.sql
```
5. **Access the application**
- Frontend: http://localhost:3000
- Backend API: http://localhost:8787
- Admin Dashboard: http://localhost:3000/admin
## 6. Database Schema
+ Conversations: id, user_id, created_at, updated_at
+ Documents: id, title, content, access_level, created_at, updated_at
+ Documents_FTS: title, content, access_level
+ GroupRoles: id, group_id, role_id, created_at
+ Groups: id, name, created_at
+ Messages: id, conversation_id, role, content, created_at
+ Roles: id, name, created_at
+ Users: id, email, password_hash, created_at

