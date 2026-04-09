"use client";
import React, { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import ReactMarkdown from "react-markdown";
interface Message {
  from: "user" | "bot";
  text: string;
}
interface ChatProps {
  user: { id: number; email: string; role: string };
}
interface Conversation {
  id: string;
  title: string;
  created_at: string;
}
export default function Chat({ user }: ChatProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [showMenu, setShowMenu] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [currentConvId, setCurrentConvId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [loadingConvId, setLoadingConvId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);
  const { data: conversations = [] } = useQuery<Conversation[]>({
    queryKey: ["conversations"],
    queryFn: async () => {
      try {
        const baseUrl = "/api/proxy";
        const res = await fetch(`${baseUrl}/conversations`, {
          credentials: "include",
        });

        if (!res.ok) return [];

        const data = await res.json();

        if (Array.isArray(data)) return data;

        if (data && Array.isArray(data.results)) return data.results;

        return [];
      } catch (error) {
        console.error("Lỗi khi tải lịch sử chat:", error);
        return [];
      }
    },
  });
  const loadMessages = async (id: string) => {
    setCurrentConvId(id);
    setMessages([]);
    const baseUrl = "/api/proxy";
    const res = await fetch(`${baseUrl}/conversations/${id}`, {
      credentials: "include",
    });
    if (res.ok) {
      const data = await res.json();
      const formattedMessages = data.messages.map((m: any) => ({
        from: m.role,
        text: m.content,
      }));
      setMessages(formattedMessages);
    }
  };
  const createNewChat = async () => {
    const baseUrl = "/api/proxy";
    const res = await fetch(`${baseUrl}/conversations`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Cuộc trò chuyện mới" }),
      credentials: "include",
    });
    if (res.ok) {
      const data = await res.json();
      setCurrentConvId(data.id);
      setMessages([]);
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    }
  };
  const deleteChat = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Bạn có chắc muốn xóa lịch sử này?")) return;
    const baseUrl = "/api/proxy";
    await fetch(`${baseUrl}/conversations/${id}`, {
      method: "DELETE",
      credentials: "include",
    });
    queryClient.invalidateQueries({ queryKey: ["conversations"] });
    if (currentConvId === id) {
      setCurrentConvId(null);
      setMessages([]);
    }
  };

  const renameChat = async (id: string) => {
    if (!editTitle.trim()) return;
    const baseUrl = "/api/proxy";
    await fetch(`${baseUrl}/conversations/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: editTitle }),
      credentials: "include",
    });
    setEditingId(null);
    queryClient.invalidateQueries({ queryKey: ["conversations"] });
  };
  const searchMutation = useMutation({
    mutationFn: async (q: string) => {
      let activeConvId = currentConvId;
      let isNewConv = false;
      const baseUrl = "/api/proxy";
      if (!activeConvId) {
        const res = await fetch(`${baseUrl}/conversations`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: "Đang tải..." }),
          credentials: "include",
        });
        const data = await res.json();
        activeConvId = data.id;
        setCurrentConvId(data.id);
        isNewConv = true;
      }
      setLoadingConvId(activeConvId);

      const res = await fetch(`${baseUrl}/search`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          q,

          conversationId: activeConvId,
          isNewConv,
        }),
        credentials: "include",
      });
      if (res.status === 401) {
        document.cookie =
          "frensai_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
        window.location.href = "/login";
        throw new Error("Unauthorized");
      }
      const data = await res.json();
      return { ...data, requestedConvId: activeConvId };
    },
    onSuccess: (data) => {
      if (currentConvId === data.requestedConvId) {
        setMessages((m) => [
          ...m,
          { from: "bot", text: data.response || "Không có phản hồi" },
        ]);
      }

      setLoadingConvId(null);
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
    onError: () =>
      setMessages((m) => [...m, { from: "bot", text: "Lỗi kết nối API" }]),
  });

  const send = (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!input.trim() || searchMutation.isPending) return;

    setMessages((m) => [...m, { from: "user", text: input }]);
    searchMutation.mutate(input);
    setInput("");
  };

  const handleLogout = async () => {
    const baseUrl = "/api/proxy";
    await fetch(`${baseUrl}/logout`, {
      method: "POST",
      credentials: "include",
    });
    document.cookie = "frensai_token=; Max-Age=0; path=/;";
    window.location.href = "/login";
  };
  const userIcon =
    user.role === "Admin" ? "/images/admin.png" : "/images/user.png";
  return (
    <div className="flex h-[750px] w-full max-w-6xl mx-auto border-4 border-black bg-white shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] relative overflow-hidden transition-all duration-300">
      {!isSidebarOpen && (
        <button
          onClick={() => setIsSidebarOpen(true)}
          className="absolute top-4 left-4 z-20 bg-yellow-400 p-2 border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M4 6h16M4 12h16M4 18h16"
            ></path>
          </svg>
        </button>
      )}
      <div
        className={`${isSidebarOpen ? "w-72 border-r-4 border-black" : "w-0"} bg-slate-900 text-white flex flex-col transition-all duration-300 shrink-0 overflow-hidden`}
      >
        <div className="p-4 flex items-center justify-between border-b-2 border-slate-700 min-w-[18rem]">
          <button
            onClick={() => setIsSidebarOpen(false)}
            className="p-1 hover:bg-slate-700 rounded"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M4 6h16M4 12h16M4 18h16"
              ></path>
            </svg>
          </button>
          <button
            onClick={createNewChat}
            className="flex items-center gap-2 bg-blue-600 px-3 py-2 text-sm font-bold border-2 border-black shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] hover:bg-blue-700"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M12 4v16m8-8H4"
              ></path>
            </svg>
            Chat Mới
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2 min-w-[18rem]">
          <p className="text-xs font-bold text-slate-400 px-2 mt-4 mb-2 uppercase">
            Gần đây
          </p>
          {conversations.map((conv) => (
            <div
              key={conv.id}
              onClick={() => loadMessages(conv.id)}
              className={`group flex items-center justify-between p-3 cursor-pointer border-2 mb-2 transition-colors ${
                currentConvId === conv.id
                  ? "bg-slate-800 border-yellow-400"
                  : "border-transparent hover:bg-slate-800"
              }`}
            >
              {editingId === conv.id ? (
                <input
                  autoFocus
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  onBlur={() => renameChat(conv.id)}
                  onKeyDown={(e) => e.key === "Enter" && renameChat(conv.id)}
                  className="bg-black text-white px-2 py-1 w-full text-sm outline-none border border-slate-500"
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <div className="flex items-center gap-3 overflow-hidden w-full">
                  <svg
                    className="w-4 h-4 shrink-0 text-slate-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                    ></path>
                  </svg>
                  <span className="truncate text-sm font-medium">
                    {conv.title}
                  </span>
                </div>
              )}

              {editingId !== conv.id && (
                <div className="hidden group-hover:flex items-center gap-1 shrink-0 ml-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingId(conv.id);
                      setEditTitle(conv.title);
                    }}
                    className="p-1 text-slate-400 hover:text-white"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                      ></path>
                    </svg>
                  </button>
                  <button
                    onClick={(e) => deleteChat(conv.id, e)}
                    className="p-1 text-slate-400 hover:text-red-500"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      ></path>
                    </svg>
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
      <div className="fixed top-8 right-8 z-50">
        <button
          onClick={() => setShowMenu(!showMenu)}
          className="w-16 h-16 rounded-full border-4 border-white overflow-hidden shadow-[0_0_20px_rgba(59,130,246,0.5)] hover:scale-110 transition-transform bg-white"
        >
          <img
            src={userIcon}
            alt="Avatar"
            className="w-full h-full object-cover"
          />
        </button>

        {showMenu && (
          <div className="absolute right-0 mt-4 w-64 bg-white border-4 border-black p-4 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] text-black">
            <div className="mb-4 border-b-2 border-black pb-2">
              <p className="text-[15px] uppercase font-black opacity-50">
                Email
              </p>
              <p className="font-bold text-sm truncate">{user.email}</p>
              <p className="text-[15px] uppercase font-black opacity-50">
                Role
              </p>
              <p
                className={`font-black uppercase ${user.role === "Admin" ? "text-red-600" : "text-blue-600"}`}
              >
                {user.role}
              </p>
            </div>

            <div className="flex flex-col gap-2">
              {user.role === "Admin" && (
                <button
                  onClick={() => router.push("/admin")}
                  className="bg-blue-600 text-white border-2 border-black p-2 font-black uppercase text-xs shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-black"
                >
                  Admin Dashboard
                </button>
              )}
              <button
                onClick={handleLogout}
                className="bg-red-500 text-white border-2 border-black p-2 font-black uppercase text-xs shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-black"
              >
                Logout
              </button>
            </div>
          </div>
        )}
      </div>
      <div className="flex-1 flex flex-col relative bg-slate-50 min-w-0">
        {" "}
        {/* GIAO DIỆN GIỮ NGUYÊN */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center opacity-50">
              <h2 className="text-3xl font-black uppercase text-slate-400">
                FrensAI
              </h2>
              <p className="font-bold text-blue-500">Bắt đầu trò chuyện</p>
            </div>
          ) : (
            messages.map((m, i) => (
              <div
                key={i}
                className={`flex ${m.from === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] p-4 border-2 border-black font-sans leading-relaxed ${m.from === "user" ? "bg-blue-600 text-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]" : "bg-white text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"}`}
                >
                  <ReactMarkdown
                    components={{
                      ol: ({ node, ...props }) => (
                        <ol
                          className="list-decimal ml-6 space-y-2"
                          {...props}
                        />
                      ),
                      li: ({ node, ...props }) => (
                        <li className="pl-1" {...props} />
                      ),
                      strong: ({ node, ...props }) => (
                        <strong className="font-black" {...props} />
                      ),
                      p: ({ node, ...props }) => (
                        <p className="mb-2 last:mb-0" {...props} />
                      ),
                    }}
                  >
                    {m.text}
                  </ReactMarkdown>
                </div>
              </div>
            ))
          )}

          {searchMutation.isPending && loadingConvId === currentConvId && (
            <div className="flex justify-start">
              <div className="p-4 border-2 border-black font-bold bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex gap-1">
                <span className="w-2 h-2 bg-black rounded-full animate-bounce"></span>
                <span className="w-2 h-2 bg-black rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                <span className="w-2 h-2 bg-black rounded-full animate-bounce [animation-delay:-0.3s]"></span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
        <form
          onSubmit={send}
          className="border-t-4 border-black p-4 flex gap-2 bg-white"
        >
          <input
            className="flex-1 border-2 border-black p-3 font-bold text-black"
            placeholder="Hỏi AI về thông tin..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={searchMutation.isPending}
          />
          <button
            type="submit"
            className={`bg-yellow-400 border-2 border-black p-3 text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] ${searchMutation.isPending ? "opacity-50" : ""}`}
            disabled={searchMutation.isPending}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="w-6 h-6"
            >
              <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
            </svg>
          </button>
        </form>
      </div>
    </div>
  );
}
