type StudentVerifiedBadgeProps = {
  compact?: boolean;
};

export function StudentVerifiedBadge({ compact = false }: StudentVerifiedBadgeProps) {
  return (
    <div
      className={`inline-flex items-center gap-2 rounded-full border border-[#2E7D5B]/20 bg-gradient-to-r from-[#2E7D5B]/10 to-[#F59E0B]/10 font-black text-[#2E7D5B] shadow-sm ${
        compact ? "px-3 py-1 text-[11px]" : "px-4 py-2 text-xs"
      }`}
    >
      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#2E7D5B] text-[10px] text-white">
        🎓
      </span>
      <span>Doğrulanmış Öğrenci</span>
    </div>
  );
}