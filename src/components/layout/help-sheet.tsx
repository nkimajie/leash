"use client";

import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";

const HOW_IT_WORKS = [
  { title: "Ask", text: "Tell me what you need. I'll find it and check your rules." },
  { title: "Review", text: "Bigger or unusual purchases wait for your tap. A reservation isn't a charge." },
  { title: "Teach", text: "Every yes, no, and reason helps your twin get to know your taste." },
];

export function HelpSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Sheet open={open} onClose={onClose} close="none" white title="A little help, on your terms.">
      <div className="flex flex-col gap-6">
        {HOW_IT_WORKS.map(({ title, text }) => (
          <section key={title}>
            <h3 className="text-xl font-semibold">{title}</h3>
            <p className="mt-3 text-base">{text}</p>
          </section>
        ))}
        <Button onClick={onClose}>Done</Button>
      </div>
    </Sheet>
  );
}
