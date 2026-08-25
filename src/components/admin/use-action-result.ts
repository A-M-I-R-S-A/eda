"use client";

import { useState } from "react";
import type { FormState } from "@/lib/actions/types";

/**
 * Reacts to a *new* Server Action result.
 *
 * Every admin screen needs the same thing after a save: close the dialog, show
 * the toast, clear the dirty flag. Doing that in an effect works but costs an
 * extra render — the browser paints the stale UI first, so a dialog visibly
 * lingers for a frame after the save that closed it.
 *
 * Adjusting state during render is React's documented answer to exactly this
 * situation: the update is applied before the component's output is committed,
 * so the user only ever sees the settled result.
 *
 * `onResult` may only touch state owned by the calling component. Genuine side
 * effects — `router.refresh()`, navigation, timers — still belong in an
 * effect; `useActionSideEffect` below is the paired helper for those.
 */
export function useActionResult<T>(
  state: FormState<T>,
  onResult: (state: FormState<T>) => void,
): void {
  const [seen, setSeen] = useState(state.submissionId);

  if (state.submissionId !== seen) {
    setSeen(state.submissionId);
    if (state.status !== "idle") onResult(state);
  }
}
