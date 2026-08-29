import { Kbd, KbdGroup } from "./kbd";
import { splitShortcutLabel } from "../../keybindings";
import { cn } from "~/lib/utils";

export function ShortcutKbd(props: {
  shortcutLabel: string;
  className?: string;
  groupClassName?: string;
}) {
  const parts = splitShortcutLabel(props.shortcutLabel);

  return (
    <KbdGroup className={cn("gap-1", props.groupClassName)}>
      {parts.map((part, index) => (
        <span key={`${part}-${index}`} className="inline-flex items-center gap-1">
          {index > 0 && props.shortcutLabel.includes("+") ? (
            <span aria-hidden className="text-muted-foreground/60">
              +
            </span>
          ) : null}
          <Kbd className={props.className}>{part}</Kbd>
        </span>
      ))}
    </KbdGroup>
  );
}
