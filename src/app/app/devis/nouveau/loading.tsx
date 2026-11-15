import { Skeleton } from "@/components/ui/primitives";

export default function Loading() {
  return (
    <div aria-busy="true" className="space-y-4">
      <Skeleton className="h-8 w-48" />
      <div className="grid grid-cols-4 gap-1.5">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-1.5" />)}</div>
      <Skeleton className="h-64 rounded-2xl" />
    </div>
  );
}
