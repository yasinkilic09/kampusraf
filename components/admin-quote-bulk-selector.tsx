"use client";

import { useEffect, useState } from "react";

type AdminQuoteBulkSelectorProps = {
  formId: string;
  total: number;
};

export function AdminQuoteBulkSelector({
  formId,
  total,
}: AdminQuoteBulkSelectorProps) {
  const [selectedCount, setSelectedCount] = useState(0);

  useEffect(() => {
    const checkboxes = Array.from(
      document.querySelectorAll<HTMLInputElement>(
        `input[data-bulk-form="${formId}"][type="checkbox"]`
      )
    );

    const updateSelectedCount = () => {
      setSelectedCount(checkboxes.filter((item) => item.checked).length);
    };

    checkboxes.forEach((checkbox) => {
      checkbox.addEventListener("change", updateSelectedCount);
    });
    updateSelectedCount();

    return () => {
      checkboxes.forEach((checkbox) => {
        checkbox.removeEventListener("change", updateSelectedCount);
      });
    };
  }, [formId, total]);

  function setAllChecked(checked: boolean) {
    const checkboxes = Array.from(
      document.querySelectorAll<HTMLInputElement>(
        `input[data-bulk-form="${formId}"][type="checkbox"]`
      )
    );

    checkboxes.forEach((checkbox) => {
      checkbox.checked = checked;
    });
    setSelectedCount(checked ? checkboxes.length : 0);
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="rounded-full bg-[#FAF7F0] px-3 py-2 text-xs font-black text-slate-600">
        {selectedCount}/{total} seçili
      </span>
      <button
        type="button"
        onClick={() => setAllChecked(true)}
        className="rounded-full bg-[#2E7D5B]/10 px-3 py-2 text-xs font-black text-[#2E7D5B] transition hover:bg-[#2E7D5B]/15"
      >
        Tümünü Seç
      </button>
      <button
        type="button"
        onClick={() => setAllChecked(false)}
        className="rounded-full bg-white px-3 py-2 text-xs font-black text-slate-500 transition hover:bg-slate-50"
      >
        Temizle
      </button>
    </div>
  );
}
