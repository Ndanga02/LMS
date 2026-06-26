"use client";

import { Input } from "@/components/ui/input";

type Props = {
  name: string;
  defaultValue: string;
};

export function ColorPicker({ name, defaultValue }: Props) {
  return (
    <div className="flex gap-2">
      <input
        type="color"
        name={name}
        defaultValue={defaultValue}
        className="w-16 rounded-md border bg-background p-1"
        onChange={(e) => {
          const hex = e.target.closest("div")?.querySelector<HTMLInputElement>('[data-color-hex]');
          if (hex) hex.value = e.target.value;
        }}
      />
      <Input
        data-color-hex
        name={name}
        defaultValue={defaultValue}
        placeholder="#f97316"
        className="flex-1 font-mono"
        onChange={(e) => {
          const color = e.target.closest("div")?.querySelector<HTMLInputElement>('[type="color"]');
          if (color) color.value = e.target.value;
        }}
      />
    </div>
  );
}
