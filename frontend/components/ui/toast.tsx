"use client";

import { useEffect, useState } from "react";

// ultra-light toast system (no external deps)
export type ToastKind = "success" | "error" | "info";

let pushImpl: (msg: string, kind?: ToastKind) => void = () => {};

export function pushToast(message: string, kind: ToastKind = "info") {
  pushImpl(message, kind);
}

export function Toaster() {
  const [items, setItems] = useState<Array<{ id: number; message: string; kind: ToastKind }>>([]);

  useEffect(() => {
    pushImpl = (message, kind = "info") => {
      const id = Date.now() + Math.random();
      setItems((prev) => [...prev, { id, message, kind }]);
      setTimeout(() => {
        setItems((prev) => prev.filter((x) => x.id !== id));
      }, 2500);
    };
  }, []);

  return (
    <div className="fixed z-[1000] bottom-4 right-4 flex flex-col gap-2">
      {items.map((t) => (
        <div
          key={t.id}
          className={`px-3 py-2 rounded-md shadow text-sm border ${
            t.kind === "success"
              ? "bg-green-50 text-green-800 border-green-200"
              : t.kind === "error"
              ? "bg-red-50 text-red-800 border-red-200"
              : "bg-gray-50 text-gray-800 border-gray-200"
          }`}
        >
          {t.message}
        </div>
      ))}
    </div>
  );
}
