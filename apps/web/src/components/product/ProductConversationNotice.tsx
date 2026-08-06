import type { ProductConversationPresentation } from "../../productReadModel";
import { cn } from "../../lib/styles";

export function ProductConversationNotice({
  presentation,
  onRetryDispatch,
}: {
  readonly presentation: ProductConversationPresentation;
  readonly onRetryDispatch?: (dispatchId: string) => void;
}) {
  if (presentation.kind === "ready") return null;

  const uncertain =
    presentation.kind === "delivery_unknown" || presentation.kind === "outcome_unknown";
  return (
    <section
      data-product-conversation-state={presentation.kind}
      aria-live={presentation.kind === "loading" ? "polite" : "assertive"}
      aria-label={presentation.label}
      className="mx-auto mt-3 w-[min(100%-2rem,46rem)] rounded-xl border border-border/70 bg-background/88 px-4 py-3 shadow-xs backdrop-blur"
    >
      <div className="flex min-w-0 items-start gap-3">
        <span
          aria-hidden="true"
          className={cn(
            "mt-1.5 size-1.5 shrink-0 rounded-full",
            presentation.kind === "loading"
              ? "animate-pulse bg-muted-foreground/55 motion-reduce:animate-none"
              : uncertain
                ? "bg-warning/80"
                : presentation.kind === "rejected"
                  ? "bg-destructive/80"
                  : "bg-muted-foreground/65",
          )}
        />
        <div className="min-w-0">
          <p className="text-[10px] font-medium tracking-[0.14em] text-muted-foreground uppercase">
            {presentation.label}
          </p>
          <p className="mt-0.5 text-sm font-medium text-foreground">{presentation.title}</p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">{presentation.description}</p>
          {presentation.kind === "dispatch_blocked" && onRetryDispatch ? (
            <button
              type="button"
              className="mt-2 rounded-md border border-border px-2.5 py-1 text-xs font-medium text-foreground hover:bg-muted"
              onClick={() => onRetryDispatch(presentation.dispatchId)}
            >
              {presentation.retryLabel}
            </button>
          ) : null}
        </div>
      </div>
    </section>
  );
}
