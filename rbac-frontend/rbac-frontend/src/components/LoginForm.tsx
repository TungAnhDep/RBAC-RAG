"use client";
import React, { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";

export default function LoginForm() {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const authMutation = useMutation({
    mutationFn: async (payload: any) => {
      const path = isRegister ? "/register" : "/login";
      const fullUrl = `/api/proxy${path}`;
      const res = await fetch(fullUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Thao tác thất bại");
      return data;
    },
    onSuccess: (data) => {
      if (isRegister) {
        alert("Đăng ký thành công! Mời bạn đăng nhập.");
        setIsRegister(false);
        setConfirmPassword("");
      } else {
        window.location.href = "/";
      }
    },
    onError: (error: any) => alert(error.message),
  });

  const submit = (e: React.SyntheticEvent) => {
    e.preventDefault();
    if (isRegister && password !== confirmPassword) {
      alert("⚠️ Mật khẩu xác nhận không khớp. Vui lòng kiểm tra lại!");
      return;
    }
    authMutation.mutate(
      isRegister ? { email, password, confirmPassword } : { email, password },
    );
  };

  return (
    <form
      onSubmit={submit}
      className="w-full max-w-md bg-white p-6 rounded shadow"
    >
      <h2 className="text-xl font-semibold mb-4 text-black text-center">
        {isRegister ? "Create Account" : "Sign In"}
      </h2>
      <label className="block mb-2">
        <span className="text-sm text-black font-bold">Email</span>
        <input
          className="mt-1 block w-full text-black bg-gray-50 border border-gray-300 rounded-md p-2"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </label>
      <label className="block mb-4">
        <span className="text-sm text-black font-bold">Password</span>
        <input
          type="password"
          className="mt-1 block w-full text-black bg-gray-50 border border-gray-300 rounded-md p-2"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </label>
      {isRegister && (
        <label className="block animate-in fade-in slide-in-from-top-2 duration-300">
          <span className="text-sm text-black font-bold">Confirm Password</span>
          <input
            type="password"
            className={`mt-1 block w-full text-black bg-gray-50 border border-gray-300 rounded-md p-2 ${
              confirmPassword && password !== confirmPassword
                ? "border-red-500 bg-red-50"
                : "border-black bg-white"
            }`}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required={isRegister}
          />
          {confirmPassword && password !== confirmPassword && (
            <p className="text-[10px] text-red-600 font-black mt-1 uppercase italic">
              * Mật khẩu chưa khớp nhau
            </p>
          )}
        </label>
      )}
      <button
        className={`mt-5 w-full bg-blue-600 text-white py-2 rounded ${authMutation.isPending ? "opacity-50" : ""}`}
        type="submit"
      >
        {authMutation.isPending
          ? "Processing..."
          : isRegister
            ? "Register Now"
            : "Login"}
      </button>
      <p className="text-center font-bold text-sm text-black mt-4">
        {isRegister ? "Already have an account?" : "New to RBAC?"}
        <button
          type="button"
          onClick={() => setIsRegister(!isRegister)}
          className="ml-2 text-blue-600 underline uppercase cursor-pointer hover:text-red-400"
        >
          {isRegister ? "Login here" : "Register here"}
        </button>
      </p>
    </form>
  );
}
