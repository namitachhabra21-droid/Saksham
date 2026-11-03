"use client";

import { useEffect, useState } from "react";
import { getJobApplications, updateJobApplication, type JobApplicationRow } from "@/lib/api";

const STATUSES: JobApplicationRow["status"][] = [
  "APPLIED",
  "CONTACTED",
  "SHORTLISTED",
  "PLACED",
  "REJECTED",
];

const STATUS_STYLE: Record<JobApplicationRow["status"], string> = {
  APPLIED: "bg-surface-alt text-foreground-dim",
  CONTACTED: "bg-accent/10 text-accent",
  SHORTLISTED: "bg-emphasis/10 text-emphasis",
  PLACED: "bg-success-soft text-success",
  REJECTED: "bg-danger/10 text-danger",
};

const EDUCATION_LABEL: Record<string, string> = {
  below_10th: "below 10th", "10th": "10th pass", "12th": "12th pass", iti_diploma: "ITI / diploma",
  undergrad_ongoing: "in college", undergrad: "graduate", postgrad: "postgraduate",
};

/** Everything staff need to act on an application without leaving the row. */
function ProfileLine({ a }: { a: JobApplicationRow }) {
  const bits = [
    a.user.age ? `${a.user.age} yrs` : null,
    a.user.gender,
    a.user.education ? EDUCATION_LABEL[a.user.education] ?? a.user.education : null,
    a.user.experienceYears != null ? `${a.user.experienceYears} yrs experience` : null,
    a.user.workPreference === "home"
      ? "wants work near home"
      : a.user.preferredLocation
        ? `prefers ${a.user.preferredLocation}`
        : null,
    [a.user.district, a.user.state].filter(Boolean).join(", ") || null,
  ].filter(Boolean);
  return <p className="mt-0.5 text-xs text-foreground-faint">{bits.join(" · ") || "No profile details yet"}</p>;
}

export function ApplicationsPanel({ jobId, token }: { jobId: string; token: string }) {
  const [rows, setRows] = useState<JobApplicationRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  useEffect(() => {
    getJobApplications(token, jobId)
      .then(setRows)
      .catch(() => setError("Could not load applications."));
  }, [jobId, token]);

  async function setStatus(a: JobApplicationRow, status: JobApplicationRow["status"]) {
    setSavingId(a.id);
    // optimistic: the dropdown should not sit on the old value while the
    // request is in flight
    setRows((prev) => prev?.map((r) => (r.id === a.id ? { ...r, status } : r)) ?? prev);
    try {
      await updateJobApplication(token, a.id, { status });
    } catch {
      setRows((prev) => prev?.map((r) => (r.id === a.id ? { ...r, status: a.status } : r)) ?? prev);
      setError("Could not save that change.");
    } finally {
      setSavingId(null);
    }
  }

  if (error) return <p className="px-4 py-3 text-sm text-danger">{error}</p>;
  if (!rows) return <p className="px-4 py-3 text-sm text-foreground-faint">Loading applications…</p>;
  if (rows.length === 0)
    return <p className="px-4 py-3 text-sm text-foreground-faint">Nobody has applied to this posting yet.</p>;

  return (
    <div className="divide-y divide-border border-t border-border">
      {rows.map((a) => (
        <div key={a.id} className="flex flex-wrap items-start justify-between gap-3 px-4 py-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold">
              {a.user.name || "Unnamed beneficiary"}
              {a.user.phone && (
                <a href={`tel:${a.user.phone}`} className="ml-2 font-normal text-emphasis hover:underline">
                  {a.user.phone}
                </a>
              )}
            </p>
            <ProfileLine a={a} />
            {a.matchedTitle && (
              <p className="mt-1 text-xs text-foreground-faint">
                Matched via {a.matchedTitle}
                {a.matchedQpCode ? ` · ${a.matchedQpCode}` : ""}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2">
            <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${STATUS_STYLE[a.status]}`}>
              {a.status}
            </span>
            <select
              aria-label={`Status for ${a.user.name || "applicant"}`}
              value={a.status}
              disabled={savingId === a.id}
              onChange={(e) => setStatus(a, e.target.value as JobApplicationRow["status"])}
              className="rounded-md border border-border bg-surface px-2 py-1 text-xs outline-none focus:border-emphasis"
            >
              {STATUSES.map((sv) => (
                <option key={sv} value={sv}>
                  {sv}
                </option>
              ))}
            </select>
          </div>
        </div>
      ))}
    </div>
  );
}
