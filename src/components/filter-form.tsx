"use client";

import Form from "next/form";
import { useRef, type ReactNode } from "react";

/** GET szűrőűrlap: választásnál azonnal, gépelésnél rövid késleltetéssel frissít (kliensoldali navigáció, a fókusz megmarad). */
export function FilterForm({ action, children, className }: { action: string; children: ReactNode; className?: string }) {
  const ref = useRef<HTMLFormElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const submit = (delay: number) => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => ref.current?.requestSubmit(), delay);
  };
  return (
    <Form
      ref={ref}
      action={action}
      className={className}
      onChange={(e) => {
        const t = e.target as unknown as HTMLInputElement;
        if (t.dataset.noauto !== undefined) return;
        submit(t.tagName === "SELECT" || ["checkbox", "radio", "date"].includes(t.type) ? 0 : 380);
      }}
    >
      {children}
    </Form>
  );
}
