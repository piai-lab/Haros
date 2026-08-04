import { BrandMark } from "../BrandMark";
import { Button } from "../ui/button";

export function ProductConversationRouteState(props: {
  readonly title: string;
  readonly description: string;
  readonly primaryAction?: { readonly label: string; readonly onClick: () => void } | undefined;
  readonly secondaryAction?: { readonly label: string; readonly onClick: () => void } | undefined;
  readonly error?: string | null | undefined;
}) {
  return (
    <main className="flex min-h-0 min-w-0 flex-1 items-center justify-center bg-background px-6">
      <section className="flex max-w-md flex-col items-center text-center">
        <BrandMark aria-label="OmniMind" className="size-14" />
        <h1 className="mt-5 text-xl font-medium tracking-tight text-foreground">{props.title}</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">{props.description}</p>
        {props.error ? (
          <p role="alert" className="mt-3 text-xs leading-5 text-destructive">
            {props.error}
          </p>
        ) : null}
        {props.primaryAction || props.secondaryAction ? (
          <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
            {props.secondaryAction ? (
              <Button variant="outline" size="sm" onClick={props.secondaryAction.onClick}>
                {props.secondaryAction.label}
              </Button>
            ) : null}
            {props.primaryAction ? (
              <Button size="sm" onClick={props.primaryAction.onClick}>
                {props.primaryAction.label}
              </Button>
            ) : null}
          </div>
        ) : null}
      </section>
    </main>
  );
}
