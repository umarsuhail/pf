"use client";

import { useState, type FormEvent } from "react";

const initialForm = {
  name: "",
  phone: "",
  email: "",
  preferredTime: "",
  message: "",
};

type Status = { state: "idle" | "submitting" | "success" | "error"; message?: string };

export default function CallbackForm() {
  const [form, setForm] = useState(initialForm);
  const [status, setStatus] = useState<Status>({ state: "idle" });

  const updateField = (key: keyof typeof form, value: string) =>
    setForm((current) => ({ ...current, [key]: value }));

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!form.name.trim() || !form.phone.trim()) {
      setStatus({ state: "error", message: "Please enter your name and phone number." });
      return;
    }

    setStatus({ state: "submitting", message: "Sending request..." });

    try {
      const response = await fetch("/api/callback-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Submission failed.");

      setStatus({ state: "success", message: "Request submitted — Umar will reach out soon." });
      setForm(initialForm);
    } catch (error) {
      setStatus({
        state: "error",
        message: error instanceof Error ? error.message : "Unable to submit request.",
      });
    }
  };

  const inputClass =
    "detail-input w-full rounded-xl border px-4 py-3 text-sm outline-none transition-colors";

  return (
    <section aria-labelledby="callback-heading" className="mt-16">
      <div className="flex items-center gap-4">
        <h2
          id="callback-heading"
          className="detail-muted text-xs font-semibold uppercase tracking-[0.32em]"
        >
          Request a Callback
        </h2>
        <div className="detail-rule h-px flex-1" />
      </div>

      <form onSubmit={handleSubmit} className="mt-8 grid gap-4 sm:grid-cols-2">
        <input
          type="text"
          required
          placeholder="Your name"
          aria-label="Your name"
          value={form.name}
          onChange={(e) => updateField("name", e.target.value)}
          className={inputClass}
        />
        <input
          type="tel"
          required
          placeholder="Phone number"
          aria-label="Phone number"
          value={form.phone}
          onChange={(e) => updateField("phone", e.target.value)}
          className={inputClass}
        />
        <input
          type="email"
          placeholder="Email (optional)"
          aria-label="Email"
          value={form.email}
          onChange={(e) => updateField("email", e.target.value)}
          className={inputClass}
        />
        <input
          type="text"
          placeholder="Preferred time (optional)"
          aria-label="Preferred time to call"
          value={form.preferredTime}
          onChange={(e) => updateField("preferredTime", e.target.value)}
          className={inputClass}
        />
        <textarea
          placeholder="What would you like to discuss? (optional)"
          aria-label="Message"
          value={form.message}
          onChange={(e) => updateField("message", e.target.value)}
          rows={3}
          className={`${inputClass} sm:col-span-2 resize-none`}
        />

        <div className="flex items-center gap-4 sm:col-span-2">
          <button
            type="submit"
            disabled={status.state === "submitting"}
            className="detail-action-primary rounded-full px-6 py-3 text-sm font-semibold hover:-translate-y-1 disabled:pointer-events-none disabled:opacity-60"
          >
            {status.state === "submitting" ? "Sending..." : "Request Callback"}
          </button>
          {status.message && (
            <p
              role="status"
              className={`text-sm ${
                status.state === "success"
                  ? "detail-success"
                  : status.state === "error"
                    ? "detail-error"
                    : "detail-muted"
              }`}
            >
              {status.message}
            </p>
          )}
        </div>
      </form>
    </section>
  );
}
