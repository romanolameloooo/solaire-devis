import { Skeleton } from "@/components/ui/primitives";

export default function Loading() {
  return (
    <div aria-busy="true" aria-label="Chargement">
      <Skeleton className="h-7 w-40" />
      <Skeleton className="mt-2 h-4 w-56" />
      <div className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-[86px] rounded-2xl" />)}
      </div>
      <Skeleton className="mt-5 h-11 w-full" />
      <div className="mt-5 space-y-2.5">
        {[0, 1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-[84px] rounded-2xl md:h-14" />)}
      </div>
    </div>
  );
}
