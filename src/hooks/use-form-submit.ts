"use client";

import { useState } from "react";
import { ApiClientError } from "@/lib/api-client";

/** Standard submit lifecycle: loading flag, form-level error, per-field errors. */
export function useFormSubmit() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});

  async function run<T>(fn: () => Promise<T>): Promise<T | undefined> {
    setLoading(true);
    setError(null);
    setFields({});
    try {
      return await fn();
    } catch (e) {
      if (e instanceof ApiClientError) {
        setError(e.code === "VALIDATION_FAILED" && e.fields ? null : e.message);
        setFields(e.fields ?? {});
        if (e.code === "VALIDATION_FAILED" && !Object.keys(e.fields ?? {}).length) setError(e.message);
      } else {
        setError("errors.INTERNAL");
      }
      return undefined;
    } finally {
      setLoading(false);
    }
  }

  return { loading, error, fields, run, setError, setFields };
}
