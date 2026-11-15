import { Badge } from "@/components/ui/primitives";
import { STATUS_LABEL, type QuoteStatus } from "@/lib/types";

const VARIANT = { draft: "neutral", sent: "info", accepted: "success", refused: "danger" } as const;

export function StatusBadge({ status }: { status: QuoteStatus }) {
  return (
    <Badge variant={VARIANT[status]}>
      <span className="size-1.5 rounded-full bg-current opacity-70" />
      {STATUS_LABEL[status]}
    </Badge>
  );
}
