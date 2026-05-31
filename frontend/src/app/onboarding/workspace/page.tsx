"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Building, User, Users, Loader2 } from "lucide-react";
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
      const data: Workspace = await api.post("/workspaces", { name: workspaceName });
      localStorage.setItem("notemind_workspace", JSON.stringify(data));

      // Send invites if provided
      if (emails.trim()) {
        const emailList = emails.split(',').map(e => e.trim()).filter(Boolean);
        if (emailList.length > 0) {
          await Promise.allSettled(
            emailList.map(email =>
              api.post(`/workspaces/${data.id}/members`, { email, role: 'member' })
            )
          );
        }
      }

      router.push("/onboarding/calendar");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create workspace");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative z-10">
      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-6">
        <span className="text-[11px] font-medium text-ink-4">Step 1 of 2</span>
        <div className="flex gap-1.5">
          <div className="w-6 h-1.5 rounded-full bg-brand" />
          <div className="w-6 h-1.5 rounded-full bg-gray-200" />
        </div>
      </div>

      <div className="mb-8">
        <h1 className="font-serif text-[30px] text-ink mb-2 tracking-tight">Welcome to Notemind</h1>
        <p className="text-[14px] text-ink-4">Let&apos;s get your workspace set up before your first meeting.</p>
      </div>

      <form onSubmit={handleContinue} className="space-y-5">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-[13px] p-3 rounded-xl">
            {error}
          </div>
        )}

        <div>
          <label className="block text-[13px] font-medium text-ink-2 mb-2 flex items-center gap-2">
            <Building size={14} className="text-ink-4" /> Workspace Name
          </label>
          <input
            type="text"
            required
            value={workspaceName}
            onChange={(e) => setWorkspaceName(e.target.value)}
            disabled={isLoading}
            placeholder="e.g. Acme Corp"
            className="w-full bg-white border border-gray-200 text-ink placeholder:text-ink-5 px-4 py-3 rounded-xl
                       focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/10 transition-all
                       disabled:opacity-50 text-[14px]"
          />
        </div>

        <div>
          <label className="block text-[13px] font-medium text-ink-2 mb-2 flex items-center gap-2">
            <User size={14} className="text-ink-4" /> Your Role
          </label>
          <select
            required
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="w-full bg-white border border-gray-200 text-ink px-4 py-3 rounded-xl
                       focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/10 transition-all
                       appearance-none text-[14px]"
          >
            <option value="" disabled>Select your role...</option>
            <option value="engineering">Engineering</option>
            <option value="product">Product Management</option>
            <option value="sales">Sales & Success</option>
            <option value="executive">Founder / Executive</option>
            <option value="other">Other</option>
          </select>
        </div>

        <div>
          <label className="block text-[13px] font-medium text-ink-2 mb-2 flex items-center gap-2">
            <Users size={14} className="text-ink-4" /> Invite Teammates
            <span className="text-[11px] text-ink-5 font-normal">(optional)</span>
          </label>
          <input
            type="text"
            value={emails}
            onChange={(e) => setEmails(e.target.value)}
            placeholder="alice@co.com, bob@co.com"
            className="w-full bg-white border border-gray-200 text-ink placeholder:text-ink-5 px-4 py-3 rounded-xl
                       focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/10 transition-all text-[14px]"
          />
          <p className="text-[11px] text-ink-5 mt-1.5">Invites are sent immediately on submit</p>
        </div>

        <button
          type="submit"
          disabled={isLoading || !workspaceName.trim() || !role}
          className="w-full flex items-center justify-center gap-2 bg-brand hover:bg-brand-mid text-white font-semibold
                     py-3.5 px-4 rounded-xl transition-colors mt-4 disabled:opacity-50 text-[15px]"
        >
          {isLoading ? (
            <Loader2 size={18} className="animate-spin" />
          ) : (
            <>Continue <ArrowRight size={17} /></>
          )}
        </button>
      </form>
    </div>
  );
}
