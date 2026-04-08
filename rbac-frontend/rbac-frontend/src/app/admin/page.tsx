"use client"; // Bắt buộc chuyển sang Client Component

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";

const AdminDashboard = dynamic(() => import("@/components/AdminDashboard"), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">
      Đang tải Dashboard...
    </div>
  ),
});

export default function AdminPage() {
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    const checkAccess = async () => {
      const { jwtVerify } = await import("jose");
      const token = document.cookie
        .split("; ")
        .find((row) => row.startsWith("frensai_token="))
        ?.split("=")[1];

      if (!token) {
        router.push("/login");
        return;
      }

      const secretValue = process.env.NEXT_PUBLIC_JWT_SECRET || "your-secret";

      try {
        const secret = new TextEncoder().encode(secretValue);
        const { payload } = await jwtVerify(token, secret);

        if (payload.role !== "Admin") {
          router.push("/");
        } else {
          setIsAuthorized(true);
        }
      } catch (err) {
        console.error("JWT Verify Error:", err);
        router.push("/login");
      }
    };

    checkAccess();
  }, [router]);

  if (!isAuthorized) {
    return <div className="min-h-screen bg-slate-900" />;
  }

  return (
    <main className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <AdminDashboard />
    </main>
  );
}
