import { AlertTriangle } from "lucide-react";

/** Rappel affiché après l'envoi d'un email : nos emails peuvent arriver dans les spams. */
export function SpamHint() {
  return (
    <div className="mt-5 flex gap-2.5 rounded-xl bg-sun-soft px-4 py-3 text-left text-[13.5px] leading-snug text-[#7a5000]">
      <AlertTriangle className="mt-0.5 size-4 shrink-0" />
      <p>
        <strong>Pensez à vérifier vos spams</strong> (courrier indésirable, ou onglet « Promotions » sur Gmail).
        L&apos;email peut mettre quelques minutes à arriver. Si vous le trouvez dans les spams, marquez-le comme
        « Non spam » pour recevoir les suivants normalement.
      </p>
    </div>
  );
}
