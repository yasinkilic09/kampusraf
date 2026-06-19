import Image from "next/image";

export function BrandMark() {
  return (
    <div className="kr-brand-mark flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-[#2E7D5B]/10">
      <Image
        src="/logo-symbol.png"
        alt="KampüsRaf logo"
        width={44}
        height={44}
        className="h-10 w-10 object-contain"
      />
    </div>
  );
}
