import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { jwtVerify } from "jose";
import dynamic from "next/dynamic";
export const runtime = "edge";
const ChatContainer = dynamic(() => import("@/components/Chat"), {
  loading: () => (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">
      <p className="animate-pulse font-bold uppercase tracking-widest">
        Đang khởi tạo FrensAI...
      </p>
    </div>
  ),
});

export default async function Home() {
  const cookieStore = await cookies();
  const token = cookieStore.get("frensai_token")?.value;

  if (!token) {
    redirect("/login");
  }

  try {
    const secretValue = process.env.JWT_SECRET || "your-secret-key";
    const secret = new TextEncoder().encode(secretValue);

    const { payload } = await jwtVerify(token, secret);

    const user = {
      id: (payload.sub || payload.id) as number,
      email: payload.email as string,
      role: payload.role as string,
    };

    return (
      <main className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6">
        <div className="mb-12 text-center">
          <h1 className="text-6xl font-black text-white tracking-tighter uppercase italic">
            Frens<span className="text-blue-500">AI</span>
          </h1>
          <p className="text-slate-400 font-bold mt-2 uppercase tracking-widest text-[10px]">
            Knowledge Base & Companion
          </p>
        </div>

        <div className="w-full max-w-6xl">
          <ChatContainer user={user} />
        </div>
      </main>
    );
  } catch (error) {
    console.error("Auth Error:", error);
    redirect("/login");
  }
}
