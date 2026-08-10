import { RenameDialog } from "./RenameDialog";
import { useI18n } from "~/i18n";

interface RenameThreadDialogProps {
  open: boolean;
  currentTitle: string;
  onOpenChange: (open: boolean) => void;
  onSave: (newTitle: string) => Promise<void> | void;
}

export function RenameThreadDialog({
  open,
  currentTitle,
  onOpenChange,
  onSave,
}: RenameThreadDialogProps) {
  const { t } = useI18n();
  return (
    <RenameDialog
      open={open}
      title={t("renameTask.title")}
      description={t("renameTask.description")}
      initialValue={currentTitle}
      onOpenChange={onOpenChange}
      onSave={onSave}
    />
  );
}
