"use client";
import React, { useState } from "react";
import pdfToText from "react-pdftotext";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import ReactMarkdown from "react-markdown";
interface Role {
  id: number;
  name: string;
}

interface Group {
  id: number;
  name: string;
}

interface Assignment {
  role_id: number;
  group_id: number;
}

interface MatrixData {
  roles: Role[];
  groups: Group[];
  assignments: Assignment[];
}

interface ProcessedGroup extends Group {
  fullLabel: string;
  shortLabel: string;
}
export default function AdminDashboard() {
  const router = useRouter();
  const queryClient = useQueryClient();

  // --- UI STATES ---
  const [activeTab, setActiveTab] = useState("ingest");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [groupIds, setGroupIds] = useState<number[]>([]);
  const [newRoleName, setNewRoleName] = useState("");
  const [newGroupName, setNewGroupName] = useState("");
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);
  const [pendingUserRoles, setPendingUserRoles] = useState<
    Record<number, number>
  >({});
  const [pendingDocGroups, setPendingDocGroups] = useState<
    Record<number, number[]>
  >({});
  const [viewingDoc, setViewingDoc] = useState<any | null>(null);
  const API_URL = process.env.NEXT_PUBLIC_API_URL;
  const apiFetch = async (endpoint: string, options: RequestInit = {}) => {
    const fullUrl = `/api/proxy${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;
    const res = await fetch(fullUrl, {
      ...options,
      credentials: "include",
      headers: {
        ...(options.body && { "Content-Type": "application/json" }),
        ...options.headers,
      },
    });
    if (res.status === 401) {
      alert("Quyền hạn của bạn đã thay đổi. Vui lòng đăng nhập lại!");
      document.cookie =
        "frensai_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
      window.location.href = "/login";
      return;
    }
    if (!res.ok) throw new Error("API Error");
    return res.json();
  };
  const deleteRoleMutation = useMutation({
    mutationFn: (id: number) =>
      apiFetch(`/admin/roles/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "matrix"] });
      alert("Đã xóa Role thành công!");
    },
  });

  const [editing, setEditing] = useState<{
    type: "role" | "group";
    id: number;
    value: string;
  } | null>(null);

  // 2. Mutations
  const updateNameMutation = useMutation({
    mutationFn: async (payload: {
      type: "role" | "group";
      id: number;
      name: string;
    }) => {
      const path =
        payload.type === "role"
          ? "/admin/roles/update"
          : "/admin/groups/update";
      return apiFetch(path, {
        method: "POST",
        body: JSON.stringify({ id: payload.id, name: payload.name }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "matrix"] });
      setEditing(null); // Thoát chế độ sửa
    },
  });

  const handleSave = () => {
    if (editing && editing.value.trim()) {
      updateNameMutation.mutate({
        type: editing.type,
        id: editing.id,
        name: editing.value,
      });
    } else {
      setEditing(null);
    }
  };
  const deleteMutation = useMutation({
    mutationFn: (docId: number) =>
      apiFetch("/admin/documents/" + docId, {
        method: "DELETE",
      }),

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "documents"] });
      alert("Đã xóa tài liệu thành công!");
    },
  });
  const deleteUserMutation = useMutation({
    mutationFn: (userId: number) =>
      apiFetch("/admin/users/" + userId, {
        method: "DELETE",
      }),

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      alert("Đã xóa người dùng thành công!");
    },
  });
  const deleteGroupMutation = useMutation({
    mutationFn: (id: number) =>
      apiFetch(`/admin/groups/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "matrix"] });
      alert("Đã xóa nhóm thành công!");
    },
  });
  const { data: users = [] } = useQuery({
    queryKey: ["admin", "users"],
    queryFn: () => apiFetch("/admin/users"),
    enabled: activeTab === "users",
  });

  const { data: documents = [] } = useQuery({
    queryKey: ["admin", "documents"],
    queryFn: () => apiFetch("/admin/documents"),
    enabled: activeTab === "documents",
  });

  const { data: matrix = { roles: [], groups: [], assignments: [] } } =
    useQuery<MatrixData>({
      queryKey: ["admin", "matrix"],
      queryFn: () => apiFetch("/admin/permissions/matrix"),
      enabled:
        activeTab === "matrix" ||
        activeTab === "users" ||
        activeTab === "documents" ||
        activeTab === "ingest",
    });

  const invalidateMatrix = () =>
    queryClient.invalidateQueries({ queryKey: ["admin", "matrix"] });

  const createRoleMutation = useMutation({
    mutationFn: (name: string) =>
      apiFetch("/admin/roles/create", {
        method: "POST",
        body: JSON.stringify({ name }),
      }),
    onSuccess: () => {
      setNewRoleName("");
      invalidateMatrix();
    },
  });

  const createGroupMutation = useMutation({
    mutationFn: (name: string) =>
      apiFetch("/admin/groups/create", {
        method: "POST",
        body: JSON.stringify({ name }),
      }),
    onSuccess: () => {
      setNewGroupName("");
      invalidateMatrix();
    },
  });

  const togglePermissionMutation = useMutation({
    mutationFn: ({ rId, gId, assigned }: any) =>
      apiFetch(
        assigned ? "/admin/roles/remove-group" : "/admin/roles/add-group",
        {
          method: "POST",
          body: JSON.stringify({ role_id: rId, group_id: gId }),
        },
      ),
    onSuccess: invalidateMatrix,
  });

  const updateRoleMutation = useMutation({
    mutationFn: (payload: any) =>
      apiFetch("/admin/users/update-role", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    onSuccess: async (_, { user_id }) => {
      await queryClient.invalidateQueries({ queryKey: ["admin", "users"] });

      setPendingUserRoles((p) => {
        const n = { ...p };
        delete n[user_id];
        return n;
      });

      alert("Cập nhật quyền hạn thành công!");
    },
  });

  const updateDocGroupsMutation = useMutation({
    mutationFn: (payload: any) =>
      apiFetch("/admin/documents/update-groups", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    onSuccess: (_, { document_id }) => {
      setPendingDocGroups((p) => {
        const n = { ...p };
        delete n[document_id];
        return n;
      });
      queryClient.invalidateQueries({ queryKey: ["admin", "documents"] });
    },
  });

  const ingestMutation = useMutation({
    mutationFn: (payload: any) =>
      apiFetch("/ingest/document", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      alert("Nạp thành công!");
      setTitle("");
      setContent("");
      setGroupIds([]);
    },
  });
  const processedGroups = React.useMemo((): ProcessedGroup[] => {
    if (!matrix.groups || matrix.groups.length === 0) return [];

    const publicGroup = matrix.groups.find((g) =>
      g.name.toLowerCase().includes("public"),
    );

    const otherGroups = matrix.groups
      .filter((g) => g.id !== publicGroup?.id)
      .sort((a, b) => a.id - b.id);

    const finalSortedList = publicGroup
      ? [...otherGroups, publicGroup]
      : otherGroups;

    return finalSortedList.map(
      (g, index): ProcessedGroup => ({
        ...g,
        fullLabel: `G${String(index + 1).padStart(2, "0")}: ${g.name}`,
        shortLabel: `G${String(index + 1).padStart(2, "0")}`,
      }),
    );
  }, [matrix.groups]);
  const handlePDFUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const objectUrl = URL.createObjectURL(file);
      setPdfPreviewUrl(objectUrl);
      try {
        const text = await pdfToText(file);
        setTitle(file.name);
        setContent(text);
      } catch (err) {
        alert("Lỗi đọc PDF");
      }
    }
  };

  return (
    <div className="w-full max-w-6xl bg-white border-4 border-black p-8 shadow-[16px_16px_0px_0px_rgba(0,0,0,1)] text-black font-bold">
      {/* HEADER */}
      <div className="flex justify-between items-center mb-8 border-b-4 border-black pb-4">
        <h2 className="text-4xl font-black uppercase italic text-blue-600 italic">
          FrensAI Admin
        </h2>
        <button
          onClick={() => router.push("/")}
          className="bg-black text-white px-6 py-2 border-2 border-black uppercase shadow-[4px_4px_0px_0px_rgba(255,0,0,1)]"
        >
          Thoát
        </button>
      </div>

      {/* TABS */}
      <div className="flex gap-4 mb-8 overflow-x-auto pb-2">
        {["ingest", "users", "documents", "matrix"].map((t) => (
          <button
            key={t}
            onClick={() => setActiveTab(t)}
            className={`px-6 py-3 border-4 border-black uppercase transition-all ${activeTab === t ? "bg-yellow-400 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] -translate-y-1" : "bg-gray-100 hover:bg-gray-200"}`}
          >
            {t === "ingest"
              ? "Nạp Dữ Liệu"
              : t === "users"
                ? "Nhân Viên"
                : t === "documents"
                  ? "Tài Liệu"
                  : "Ma Trận Quyền"}
          </button>
        ))}
      </div>

      {/* TAB MATRIX & CREATION */}
      {activeTab === "matrix" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex gap-2 p-4 border-4 border-black bg-blue-50 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              <input
                className="flex-1 border-2 border-black p-2 font-bold"
                placeholder="Tên Role mới..."
                value={newRoleName}
                onChange={(e) => setNewRoleName(e.target.value)}
              />
              <button
                onClick={() => createRoleMutation.mutate(newRoleName)}
                className="bg-black text-white px-4 py-2 uppercase"
              >
                Thêm Role
              </button>
            </div>
            <div className="flex gap-2 p-4 border-4 border-black bg-green-50 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              <input
                className="flex-1 border-2 border-black p-2 font-bold focus:bg-white outline-none"
                placeholder="Tên Group mới"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                onKeyDown={(e) =>
                  e.key === "Enter" && createGroupMutation.mutate(newGroupName)
                }
              />
              <button
                onClick={() => createGroupMutation.mutate(newGroupName)}
                className="bg-black text-white px-4 py-2 uppercase font-black hover:bg-green-600 transition-colors"
              >
                Thêm Group
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-4 border-black text-center">
              <thead>
                <tr className="bg-black text-white">
                  <th className="p-4 border-2 border-white">ROLE / GROUP</th>
                  {processedGroups.map((g) => (
                    <th
                      key={g.id}
                      className="p-2 border-2 border-white bg-black text-white group relative min-w-[140px]"
                    >
                      {editing?.type === "group" && editing.id === g.id ? (
                        <input
                          autoFocus
                          className="bg-white text-black p-1 w-full text-center border-2 border-yellow-400 text-xs font-bold"
                          value={editing.value}
                          onChange={(e) =>
                            setEditing({ ...editing, value: e.target.value })
                          }
                          onKeyDown={(e) => e.key === "Enter" && handleSave()}
                          onBlur={handleSave}
                        />
                      ) : (
                        <div className="flex flex-col items-center py-2">
                          <span className="text-[10px] opacity-70 mb-1">
                            {g.shortLabel}
                          </span>
                          <span className="text-xs font-bold px-2 mb-4">
                            {g.name}
                          </span>

                          <div className="absolute bottom-1 left-0 right-0 flex justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() =>
                                setEditing({
                                  type: "group",
                                  id: g.id,
                                  value: g.name,
                                })
                              }
                              className="p-1 bg-blue-600 rounded-sm hover:bg-white hover:text-blue-600 transition-colors"
                              title="Sửa tên nhóm"
                            >
                              <svg
                                className="w-3 h-3"
                                fill="currentColor"
                                viewBox="0 0 20 20"
                              >
                                <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                              </svg>
                            </button>
                            <button
                              onClick={() =>
                                window.confirm(`Xóa nhóm ${g.name}?`) &&
                                deleteGroupMutation.mutate(g.id)
                              }
                              className="p-1 bg-red-600 rounded-sm hover:bg-white hover:text-red-600 transition-colors"
                              title="Xóa nhóm"
                            >
                              <svg
                                className="w-3 h-3"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={3}
                                  d="M6 18L18 6M6 6l12 12"
                                />
                              </svg>
                            </button>
                          </div>
                        </div>
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {matrix.roles.map((role: any) => (
                  <tr key={role.id} className="border-b-4 border-black">
                    <td className="p-4 bg-gray-100 border-r-4 border-black uppercase font-black group relative min-w-[180px]">
                      {editing?.type === "role" && editing.id === role.id ? (
                        <input
                          autoFocus
                          className="text-black p-2 w-full border-2 border-blue-600 text-sm font-bold"
                          value={editing.value}
                          onChange={(e) =>
                            setEditing({ ...editing, value: e.target.value })
                          }
                          onKeyDown={(e) => e.key === "Enter" && handleSave()}
                          onBlur={handleSave}
                        />
                      ) : (
                        <div className="flex justify-between items-center w-full">
                          <span className="truncate mr-2">{role.name}</span>

                          <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                            <button
                              onClick={() =>
                                setEditing({
                                  type: "role",
                                  id: role.id,
                                  value: role.name,
                                })
                              }
                              className="p-1.5 bg-blue-600 text-white rounded-sm hover:bg-black transition-colors"
                              title="Sửa tên Role"
                            >
                              <svg
                                className="w-3.5 h-3.5"
                                fill="currentColor"
                                viewBox="0 0 20 20"
                              >
                                <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                              </svg>
                            </button>
                            <button
                              onClick={() =>
                                window.confirm(`Xóa Role ${role.name}?`) &&
                                deleteRoleMutation.mutate(role.id)
                              }
                              className="p-1.5 bg-red-600 text-white rounded-sm hover:bg-black transition-colors"
                              title="Xóa Role"
                            >
                              <svg
                                className="w-3.5 h-3.5"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={3}
                                  d="M6 18L18 6M6 6l12 12"
                                />
                              </svg>
                            </button>
                          </div>
                        </div>
                      )}
                    </td>
                    {processedGroups.map((group) => {
                      const isAssigned = matrix.assignments.some(
                        (a: any) =>
                          a.role_id === role.id && a.group_id === group.id,
                      );
                      return (
                        <td
                          key={group.id}
                          className="p-4 border-2 border-gray-200"
                        >
                          <input
                            type="checkbox"
                            className="w-8 h-8 cursor-pointer"
                            checked={isAssigned}
                            onChange={() =>
                              togglePermissionMutation.mutate({
                                rId: role.id,
                                gId: group.id,
                                assigned: isAssigned,
                              })
                            }
                          />
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === "users" && (
        <div className="overflow-x-auto">
          <table className="w-full border-4 border-black text-center">
            <thead className="bg-black text-white uppercase">
              <tr>
                <th className="p-4 border-2 border-white text-left">
                  Email Nhân Viên
                </th>
                <th className="p-4 border-2 border-white">Chức Vụ Hiện Tại</th>
                <th className="p-4 border-2 border-white">Thay Đổi Chức Vụ</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u: any) => (
                <tr
                  key={u.id}
                  className="border-b-4 border-black font-bold hover:bg-yellow-50"
                >
                  <td className="p-4 text-left italic border-r-2 border-black">
                    {u.email}
                  </td>
                  <td className="p-4 uppercase text-blue-700 border-r-2 border-black">
                    {u.role}
                  </td>
                  <td className="p-4 flex gap-2 justify-center items-center">
                    <select
                      className="border-2 border-black p-2 bg-white font-bold"
                      value={pendingUserRoles[u.id] || ""}
                      onChange={(e) =>
                        setPendingUserRoles({
                          ...pendingUserRoles,
                          [u.id]: Number(e.target.value),
                        })
                      }
                    >
                      <option value="">-- Chọn Role --</option>
                      {matrix.roles.map((r: any) => (
                        <option key={r.id} value={r.id}>
                          {r.name}
                        </option>
                      ))}
                    </select>
                    {pendingUserRoles[u.id] && (
                      <button
                        onClick={() =>
                          updateRoleMutation.mutate({
                            user_id: u.id,
                            role_id: pendingUserRoles[u.id],
                          })
                        }
                        className="bg-green-500 text-white px-4 py-2 border-2 border-black uppercase text-xs shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                      >
                        Lưu
                      </button>
                    )}
                    <button
                      onClick={() =>
                        window.confirm(`Xóa nhân viên ${u.email}?`) &&
                        deleteUserMutation.mutate(u.id)
                      }
                      className="p-2 bg-red-500 text-white border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-black"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-4 w-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === "documents" && (
        <div className="overflow-x-auto">
          <table className="w-full border-4 border-black text-center">
            <thead className="bg-black text-white">
              <tr>
                <th className="p-3">Tên Tài Liệu</th>
                <th className="p-3">Phân Quyền Nhóm</th>
                <th className="p-3">Thao Tác</th>
              </tr>
            </thead>
            <tbody>
              {documents.map((doc: any) => {
                const displayGroups =
                  pendingDocGroups[doc.id] || doc.groups || [];
                return (
                  <tr
                    key={doc.id}
                    className="border-b-2 border-black font-bold"
                  >
                    <td
                      className="p-3 text-left cursor-pointer group"
                      onClick={() => setViewingDoc(doc)}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] bg-black text-white px-1 font-black">
                          VIEW
                        </span>
                        <span className="group-hover:text-blue-600 group-hover:underline">
                          {doc.title}
                        </span>
                      </div>
                    </td>
                    <td className="p-3 flex gap-1 justify-center flex-wrap">
                      {processedGroups.map((g) => {
                        const isSelected = displayGroups.includes(g.id);
                        return (
                          <button
                            key={g.id}
                            onClick={() => {
                              const next = displayGroups.includes(g.id)
                                ? displayGroups.filter((id: any) => id !== g.id)
                                : [...displayGroups, g.id];

                              setPendingDocGroups({
                                ...pendingDocGroups,

                                [doc.id]: next,
                              });
                            }}
                            className={`w-10 h-8 border-2 border-black text-[10px] font-black ${
                              isSelected
                                ? "bg-blue-600 text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                                : "bg-gray-100"
                            }`}
                            title={g.name}
                          >
                            {g.shortLabel}
                          </button>
                        );
                      })}
                    </td>
                    <td className="p-3">
                      <div className="grid grid-cols-2 gap-2 items-center justify-items-center min-w-[120px]">
                        <div className="flex justify-center">
                          {pendingDocGroups[doc.id] && (
                            <button
                              onClick={() =>
                                updateDocGroupsMutation.mutate({
                                  document_id: doc.id,
                                  group_ids: pendingDocGroups[doc.id],
                                })
                              }
                              className="bg-green-500 text-white border-2 border-black p-1 text-[10px] uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[1px] hover:translate-y-[1px]"
                            >
                              Xác nhận
                            </button>
                          )}
                        </div>

                        <div className="flex justify-center place-items-center">
                          <button
                            onClick={() =>
                              window.confirm("Xóa?") &&
                              deleteMutation.mutate(doc.id)
                            }
                            className="p-2 bg-red-500 text-white border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-black transition-all"
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className="h-4 w-4"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                              />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {viewingDoc && (
            <div className="fixed inset-0 z-[100] flex justify-end">
              <div
                className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                onClick={() => setViewingDoc(null)}
              />
              <div className="relative w-full max-w-2xl bg-white border-l-8 border-black h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-300">
                <div className="p-6 border-b-4 border-black bg-yellow-400 flex justify-between items-center">
                  <h3 className="text-xl font-black uppercase truncate">
                    {viewingDoc.title}
                  </h3>
                  <button
                    onClick={() => setViewingDoc(null)}
                    className="bg-black text-white w-10 h-10 border-2 border-black"
                  >
                    ✕
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto p-8 bg-slate-50">
                  <div className="bg-white border-2 border-black p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
                    <ReactMarkdown>{viewingDoc.content}</ReactMarkdown>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === "ingest" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-black">
          <div className="space-y-4">
            <div className="border-4 border-dashed border-gray-400 p-8 text-center bg-gray-50 relative">
              {ingestMutation.isPending ? "Đang nạp..." : "Kéo thả PDF vào đây"}
              <input
                type="file"
                accept=".pdf"
                className="absolute inset-0 opacity-0 cursor-pointer"
                onChange={handlePDFUpload}
              />
            </div>
            <input
              className="w-full border-2 border-black p-3 font-bold"
              placeholder="Tiêu đề..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <textarea
              className="w-full border-2 border-black p-3 h-64 font-normal text-sm"
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />
          </div>
          <div className="space-y-4">
            <p className="uppercase font-black text-sm">
              Gán quyền cho các nhóm:
            </p>
            <div className="grid grid-cols-2 gap-2">
              {processedGroups.map((g) => (
                <label
                  key={g.id}
                  className={`flex items-center gap-3 p-3 border-2 border-black cursor-pointer transition-all ${
                    groupIds.includes(g.id)
                      ? "bg-yellow-400 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] -translate-x-1 -translate-y-1"
                      : "bg-white hover:bg-gray-50"
                  }`}
                >
                  <input
                    type="checkbox"
                    className="w-5 h-5 accent-black cursor-pointer"
                    checked={groupIds.includes(g.id)}
                    onChange={(e) =>
                      e.target.checked
                        ? setGroupIds([...groupIds, g.id])
                        : setGroupIds(groupIds.filter((i) => i !== g.id))
                    }
                  />
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black opacity-60 leading-none mb-1">
                      {g.shortLabel}
                    </span>
                    <span className="font-bold uppercase text-sm">
                      {g.name}
                    </span>
                  </div>
                </label>
              ))}
            </div>
            <button
              onClick={() =>
                ingestMutation.mutate({ title, content, group_ids: groupIds })
              }
              className="w-full bg-blue-600 text-white py-6 text-xl uppercase shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:bg-black transition-all"
            >
              Bắt đầu Ingest
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
