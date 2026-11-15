import { Skeleton } from "@/components/ui/primitives";

export default function Loading() {
  return (
    <div aria-busy="true">
      <Skeleton className="h-7 w-36" />
      <Skeleton className="mt-2 h-4 w-72" />
      <div className="mt-8 space-y-5">
        {[0, 1, 2].map((i) => <Skeleton key={i} className="h-56 rounded-2xl" />)}
      </div>
    </div>
  );
}
