"use client";

export default function Tabs({
  tabs,
  active,
  onChange,
}: {
  tabs: string[];
  active: string;
  onChange: (tab: string) => void;
}) {
  return (
    <div className="flex max-w-md rounded-lg bg-surface p-1">
      {tabs.map((tab) => (
        <button
          key={tab}
          onClick={() => onChange(tab)}
          className={`min-h-10 flex-1 rounded-md text-sm font-semibold transition-colors ${
            active === tab ? "bg-surface-2 text-foreground" : "text-muted"
          }`}
        >
          {tab}
        </button>
      ))}
    </div>
  );
}
