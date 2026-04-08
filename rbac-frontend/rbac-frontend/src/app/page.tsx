"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const ChatContainer = dynamic(() => import("@/components/Chat"), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">
      <p className="animate-pulse">Đang khởi tạo FrensAI...</p>
    </div>
  ),
});

interface User {
  id: number;
  email: string;
  role: string;
}

export default function Home() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const initAuth = async () => {
      const { jwtVerify } = await import("jose");
      const token = document.cookie
        .split("; ")
        .find((row) => row.startsWith("frensai_token="))
        ?.split("=")[1];

      if (!token) {
        router.push("/login");
        return;
      }

      try {
        const secretValue =
          process.env.NEXT_PUBLIC_JWT_SECRET || "your-secret-key";
        const secret = new TextEncoder().encode(secretValue);

        const { payload } = await jwtVerify(token, secret);

        setUser({
          id: payload.id as number,
          email: payload.email as string,
          role: payload.role as string,
        });
      } catch (error) {
        console.error("Auth error:", error);
        router.push("/login");
      }
    };

    initAuth();
  }, [router]);

  if (!user) {
    return <div className="min-h-screen bg-slate-950" />;
  }

  return (
    <main className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6">
      <div className="mb-12 text-center">
        <h1 className="text-6xl font-black text-white tracking-tighter uppercase italic">
          Frens<span className="text-blue-500">AI</span>
        </h1>
      </div>
      <div className="w-full max-w-6xl">
        <ChatContainer user={user} />
      </div>
    </main>
  );
}
