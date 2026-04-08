Create the Next.js frontend (suggested):

Run locally to scaffold a fully-configured Next + TypeScript + Tailwind app:

npx create-next-app@latest rbac-frontend --typescript --tailwind --eslint

After creating the app, copy the example pages/components from `rbac-frontend/snippets/` into the generated project:

- pages/login.tsx  -> login page
- pages/chat.tsx   -> chat/search UI
- components/LoginForm.tsx
- components/Chat.tsx

Quick run:

cd rbac-frontend
npm install
npm run dev

The snippets folder contains drop-in code you can paste into the scaffolded project.
