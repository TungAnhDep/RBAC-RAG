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
  return (
    <main className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <AdminDashboard />
    </main>
  );
}
