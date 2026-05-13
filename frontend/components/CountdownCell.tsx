import { useCountdown } from "@/hooks/useCountdown";

interface CountdownCellProps {
  expiresAt: string;
  status: string;
}

export default function CountdownCell({
  expiresAt,
  status,
}: CountdownCellProps) {
  const countdown = useCountdown(expiresAt);
  if (status !== "PENDING") {
    return (
      <span className="text-xs text-gray-500 italic">
        {status === "CONFIRMED" ? "Confirmed" : "Released"}
      </span>
    );
  }
  const isExpired = countdown.isExpired;
  return (
    <div
      className={`px-3 py-1 rounded text-xs font-semibold text-center`}>
      {isExpired ? "⏱️ EXPIRED" : countdown.timeString}
    </div>
  );
}
