"use client";

import dynamic from "next/dynamic";

const LoginForm = dynamic(() => import("@/components/LoginForm"), {
  ssr: false,
  loading: () => (
    <div className="text-white text-center">Đang tải biểu mẫu...</div>
  ),
});

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6">
      <div className="mb-12 text-center">
        <h1 className="text-6xl font-black text-white tracking-tighter uppercase italic">
          Frens<span className="text-blue-500">AI</span>
        </h1>
        <p className="text-slate-400 font-bold mt-2 uppercase tracking-widest">
          Knowledge Base & Companion
        </p>
      </div>

      <div className="w-full max-w-md">
        <LoginForm />
      </div>
    </main>
  );
}
