import { phaseLabel, phaseTone } from "@/lib/phases";

export default function PhaseBadge({ phase }: { phase: string }) {
  return <span className={`inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ${phaseTone(phase)}`}>{phaseLabel(phase)}</span>;
}
