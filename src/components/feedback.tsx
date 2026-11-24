import type { ReactNode, Ref } from "react";

export function Feedback({ children, error = false, ref }: { children: ReactNode; error?: boolean; ref?: Ref<HTMLDivElement> }) {
  return <div ref={ref} tabIndex={-1} className={`form-feedback${error ? " form-feedback-error" : ""}`} role={error ? "alert" : "status"} aria-atomic="true">{children}</div>;
}
