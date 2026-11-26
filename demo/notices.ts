export type NoticeTone = "info" | "warning" | "error";

/** Messages shown in the demo panel (save problems, viewer limitations). */
export function notify(message: string, tone: NoticeTone = "info") {
  window.dispatchEvent(new CustomEvent("demo:notice", { detail: { message, tone } }));
}
