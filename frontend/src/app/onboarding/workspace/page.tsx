"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Building, User, Users } from "lucide-react";
import { api } from "@/lib/api";
import { Workspace } from "@/types/api";

export default function WorkspaceSetup() {
  const router = useRouter();
  const [workspaceName, setWorkspaceName] = useState("");
  const [role, setRole] = useState("");
  const [emails, setEmails] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleContinue = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const data: Workspace = await api.post("/workspaces", {
        name: workspaceName,
      });

      localStorage.setItem("notemind_workspace", JSON.stringify(data));

      // In the future, send invites via another API call using the 'emails' list
      
      router.push("/onboarding/calendar");
    } catch (err: unknown) {
      console.error("Workspace creation failed:", err);
      setError(err instanceof Error ? err.message : "Failed to create workspace");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative z-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Welcome to Notemind</h1>
        <p className="text-[#8b8b9f]">Let&apos;s get your workspace set up before your first meeting.</p>
      </div>

      <form onSubmit={handleContinue} className="space-y-6">
        {error && (
          <div className="bg-red-500/10 border border-red-500/50 text-red-500 text-sm p-3 rounded-lg">
            {error}
          </div>
        )}
        <div>
          <label className="block text-sm font-medium text-[#f8f8fa] mb-2 flex items-center gap-2">
            <Building size={16} className="text-[#8b8b9f]" /> Workspace Name
          </label>
          <input
            type="text"
            required
            value={workspaceName}
            onChange={(e) => setWorkspaceName(e.target.value)}
            disabled={isLoading}
            placeholder="e.g. Acme Corp"
            className="w-full bg-[#0a0a0f] border border-[#222230] text-[#f8f8fa] placeholder-[#8b8b9f] px-4 py-3 rounded-xl focus:outline-none focus:border-[#6366f1] focus:ring-1 focus:ring-[#6366f1]/20 transition-all disabled:opacity-50"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-[#f8f8fa] mb-2 flex items-center gap-2">
            <User size={16} className="text-[#8b8b9f]" /> Your Role
          </label>
          <select
            required
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="w-full bg-[#0a0a0f] border border-[#222230] text-[#f8f8fa] px-4 py-3 rounded-xl focus:outline-none focus:border-[#6366f1] focus:ring-1 focus:ring-[#6366f1]/20 transition-all appearance-none"
          >
            <option value="" disabled>Select your role...</option>
            <option value="engineering">Engineering</option>
            <option value="product">Product Management</option>
            <option value="sales">Sales & Success</option>
            <option value="executive">Founder / Executive</option>
            <option value="other">Other</option>
          </select>
        </div>

        <div className="pt-4">
          <label className="block text-sm font-medium text-[#f8f8fa] mb-2 flex items-center gap-2">
            <Users size={16} className="text-[#8b8b9f]" /> Invite Teammates (Optional)
          </label>
          <input
            type="text"
            placeholder="emails separated by commas"
            className="w-full bg-[#0a0a0f] border border-[#222230] text-[#f8f8fa] placeholder-[#8b8b9f] px-4 py-3 rounded-xl focus:outline-none focus:border-[#6366f1] focus:ring-1 focus:ring-[#6366f1]/20 transition-all"
          />
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full flex items-center justify-center gap-2 bg-[#f8f8fa] text-[#050508] font-bold py-3 px-4 rounded-xl hover:bg-[#d4d4d8] transition-colors mt-8 disabled:opacity-50"
        >
          {isLoading ? (
            <div className="w-5 h-5 border-2 border-[#050508]/30 border-t-[#050508] rounded-full animate-spin" />
          ) : (
            <>Continue <ArrowRight size={18} /></>
          )}
        </button>
      </form>
    </div>
  );
}
