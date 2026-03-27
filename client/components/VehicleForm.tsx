"use client";

import { useState, useEffect, ChangeEvent, FormEvent } from "react";
import { QUICK_SELECTS, QuickSelect } from "@/lib/vehicleData";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
interface Sel {
  make: string;
  model: string;
  badge: string;
}
interface SubmissionResult {
  make: string;
  model: string;
  badge: string;
  logbook: { filename: string; content: string };
}
type Status =
  | { type: "idle" }
  | { type: "submitting" }
  | { type: "success"; data: SubmissionResult }
  | { type: "error"; message: string };

function makeName(make: string) {
  return make ? make.charAt(0).toUpperCase() + make.slice(1) : make;
}

export default function VehicleForm() {
  const [sel, setSel] = useState<Sel>({ make: "", model: "", badge: "" });
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<Status>({ type: "idle" });
  const [fileInputKey, setFileInputKey] = useState(0);

  const [makes, setMakes] = useState<string[]>([]);
  const [models, setModels] = useState<string[]>([]);
  const [badges, setBadges] = useState<string[]>([]);

  useEffect(() => {
    fetch(`${API}/api/makes`)
      .then((r) => r.json())
      .then((d) => setMakes(d.makes ?? []))
      .catch(() =>
        setStatus({ type: "error", message: "Failed to load makes." })
      );
  }, []);

  useEffect(() => {
    if (!sel.make) {
      setModels([]);
      return;
    }
    fetch(`${API}/api/models?make=${sel.make}`)
      .then((r) => r.json())
      .then((d) => setModels(d.models ?? []))
      .catch(() =>
        setStatus({ type: "error", message: "Failed to load models." })
      );
  }, [sel.make]);

  useEffect(() => {
    if (!sel.make || !sel.model) {
      setBadges([]);
      return;
    }
    fetch(
      `${API}/api/badges?make=${sel.make}&model=${encodeURIComponent(sel.model)}`
    )
      .then((r) => r.json())
      .then((d) => setBadges(d.badges ?? []))
      .catch(() =>
        setStatus({ type: "error", message: "Failed to load badges." })
      );
  }, [sel.make, sel.model]);

  function handleMakeChange(e: ChangeEvent<HTMLSelectElement>) {
    setSel({ make: e.target.value, model: "", badge: "" });
  }

  function handleModelChange(e: ChangeEvent<HTMLSelectElement>) {
    setSel((s) => ({ ...s, model: e.target.value, badge: "" }));
  }

  function handleQuickSelect(qs: QuickSelect) {
    setSel({ make: qs.make, model: qs.model, badge: qs.badge });
  }

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const chosen = e.target.files?.[0] ?? null;
    if (chosen && !chosen.name.endsWith(".txt")) {
      setStatus({
        type: "error",
        message: "Please select a plain text (.txt) file.",
      });
      setFile(null);
      setFileInputKey((key) => key + 1);
      return;
    }
    setStatus({ type: "idle" });
    setFile(chosen);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!sel.make || !sel.model || !sel.badge) {
      setStatus({
        type: "error",
        message: "Please select a Make, Model and Badge.",
      });
      return;
    }
    if (!file) {
      setStatus({
        type: "error",
        message: "Please upload your service logbook (.txt).",
      });
      return;
    }

    const formData = new FormData();
    formData.append("make", sel.make);
    formData.append("model", sel.model);
    formData.append("badge", sel.badge);
    formData.append("logbook", file);

    try {
      setStatus({ type: "submitting" });
      const res = await fetch(`${API}/api/submit`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Submission failed");
      setStatus({ type: "success", data: data.submission as SubmissionResult });
    } catch (err: unknown) {
      setStatus({
        type: "error",
        message: err instanceof Error ? err.message : "Unknown error",
      });
    }
  }

  function handleReset() {
    setSel({ make: "", model: "", badge: "" });
    setFile(null);
    setStatus({ type: "idle" });
    setFileInputKey((key) => key + 1);
  }

  const submitting = status.type === "submitting";
  const result = status.type === "success" ? status.data : null;
  const error = status.type === "error" ? status.message : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-slate-100 flex items-start justify-center py-12 px-4">
      <div className="w-full max-w-2xl">
        <div className="mb-8 text-center">
          <span className="inline-block text-5xl mb-3">🚗</span>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">
            Vehicle Selection
          </h1>
          <p className="mt-2 text-gray-500 text-sm">
            Select your vehicle and upload your service logbook
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-lg ring-1 ring-gray-100 p-8">
          <section className="mb-8">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">
              Quick Select
            </h2>
            <div className="grid grid-cols-2 gap-3">
              {QUICK_SELECTS.map((qs) => (
                <button
                  key={qs.label}
                  type="button"
                  onClick={() => handleQuickSelect(qs)}
                  className={`btn-quick ${
                    sel.make === qs.make &&
                    sel.model === qs.model &&
                    sel.badge === qs.badge
                      ? "bg-blue-50 border-blue-500 text-blue-800"
                      : ""
                  }`}
                >
                  <span className="text-base">{qs.icon}</span>
                  <span className="truncate">{qs.label}</span>
                </button>
              ))}
            </div>
          </section>

          <div className="border-t border-gray-100 mb-8" />

          <form onSubmit={handleSubmit} noValidate className="space-y-6">
            <div className="field-group">
              <label className="form-label" htmlFor="make">
                Make <span className="text-red-500">*</span>
              </label>
              <select
                id="make"
                value={sel.make}
                onChange={handleMakeChange}
                className="form-select"
                required
              >
                <option value="">— Select Make —</option>
                {makes.map((m: string) => (
                  <option key={m} value={m}>
                    {makeName(m)}
                  </option>
                ))}
              </select>
            </div>

            <div className="field-group">
              <label className="form-label" htmlFor="model">
                Model <span className="text-red-500">*</span>
              </label>
              <select
                id="model"
                value={sel.model}
                onChange={handleModelChange}
                disabled={!sel.make}
                className="form-select"
                required
              >
                <option value="">
                  {sel.make ? "— Select Model —" : "— Select a Make first —"}
                </option>
                {models.map((m: string) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>

            <div className="field-group">
              <label className="form-label" htmlFor="badge">
                Badge <span className="text-red-500">*</span>
              </label>
              <select
                id="badge"
                value={sel.badge}
                onChange={(e) =>
                  setSel((s) => ({ ...s, badge: e.target.value }))
                }
                disabled={!sel.model}
                className="form-select"
                required
              >
                <option value="">
                  {sel.model ? "— Select Badge —" : "— Select a Model first —"}
                </option>
                {badges.map((b: string) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </div>

            {sel.badge && (
              <div className="field-group">
                <label className="form-label" htmlFor="logbook">
                  Service Logbook <span className="text-red-500">*</span>
                  <span className="ml-2 text-xs font-normal text-gray-400">
                    (.txt files only)
                  </span>
                </label>
                <div className="flex items-center gap-3">
                  <input
                    key={fileInputKey}
                    id="logbook"
                    type="file"
                    accept=".txt,text/plain"
                    onChange={handleFileChange}
                    className="block w-full text-sm text-gray-500
                               file:mr-4 file:py-2 file:px-4
                               file:rounded-lg file:border-0
                               file:text-sm file:font-semibold
                               file:bg-blue-50 file:text-blue-700
                               hover:file:bg-blue-100
                               cursor-pointer"
                  />
                  {file && (
                    <span className="text-green-600 text-lg flex-shrink-0">
                      ✓
                    </span>
                  )}
                </div>
                {file && (
                  <p className="text-xs text-gray-400 mt-1">
                    Selected: <strong>{file.name}</strong>
                  </p>
                )}
              </div>
            )}

            {error && (
              <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 flex items-start gap-2">
                <span className="text-red-500 text-lg leading-none">⚠</span>
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={submitting}
                className="btn-primary flex-1"
              >
                {submitting ? (
                  <>
                    <svg
                      className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                      />
                    </svg>
                    Submitting…
                  </>
                ) : (
                  "Submit"
                )}
              </button>
              <button
                type="button"
                onClick={handleReset}
                className="px-5 py-2.5 rounded-lg border border-gray-300 text-gray-600 font-medium hover:bg-gray-50 transition-colors duration-150"
              >
                Reset
              </button>
            </div>
          </form>
        </div>

        {result && (
          <div className="mt-8 bg-white rounded-2xl shadow-lg ring-1 ring-green-100 p-8">
            <div className="flex items-center gap-3 mb-6">
              <span className="text-3xl">✅</span>
              <h2 className="text-xl font-bold text-gray-900">
                Submission Successful
              </h2>
            </div>
            <div className="space-y-4">
              <h3 className="text-xs font-semibold uppercase tracking-widest text-gray-400">
                Vehicle Selection
              </h3>
              <dl className="grid grid-cols-3 gap-4">
                {[
                  { label: "Make", value: makeName(result.make) },
                  { label: "Model", value: result.model },
                  { label: "Badge", value: result.badge },
                ].map(({ label, value }) => (
                  <div key={label} className="bg-gray-50 rounded-lg px-4 py-3">
                    <dt className="text-xs text-gray-400 font-medium uppercase tracking-wide">
                      {label}
                    </dt>
                    <dd className="mt-1 text-sm font-semibold text-gray-800">
                      {value}
                    </dd>
                  </div>
                ))}
              </dl>
              <div className="border-t border-gray-100 pt-4">
                <h3 className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-2">
                  Logbook — {result.logbook.filename}
                </h3>
                <pre className="bg-gray-900 text-green-400 rounded-lg p-4 text-xs overflow-auto max-h-64 font-mono whitespace-pre-wrap break-words">
                  {result.logbook.content}
                </pre>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
