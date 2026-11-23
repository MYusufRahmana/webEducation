const PATHS: Record<string, string> = {
  prev: "M10 3 5 8l5 5",
  next: "M6 3l5 5-5 5",
  down: "M8 3v10M4 9l4 4 4-4",
  replay: "M3.5 8a4.5 4.5 0 1 0 1.4-3.3M3 2.5v3h3",
  pause: "M5.5 3.5v9M10.5 3.5v9",
  play: "M5 3.2v9.6L12.6 8z",
  expand: "M3 6V3h3M10 3h3v3M13 10v3h-3M6 13H3v-3",
  shrink: "M6 3v3H3M13 6h-3V3M10 13v-3h3M3 10h3v3",
  hide: "M3 6l5 5 5-5",
  show: "M3 10l5-5 5 5",
  close: "M4 4l8 8M12 4l-8 8",
  menu: "M2.5 4h11M2.5 8h11M2.5 12h11",
  search: "M7 2.5a4.5 4.5 0 1 0 0 9 4.5 4.5 0 0 0 0-9zM10.3 10.3l3.2 3.2",
  folder: "M2 4.5V12a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V6a1 1 0 0 0-1-1H8L6.5 3.5H3a1 1 0 0 0-1 1z",
  doc: "M4 2h5l3 3v9H4zM9 2v3h3M6 8.5h4M6 11h4",
  chevron: "M4 6l4 4 4-4",
  idea: "M8 2a4 4 0 0 0-2.4 7.2V11h4.8V9.2A4 4 0 0 0 8 2zM6.2 13.5h3.6",
  eye: "M1.5 8S4 3.5 8 3.5 14.5 8 14.5 8 12 12.5 8 12.5 1.5 8 1.5 8zM8 6a2 2 0 1 0 0 4 2 2 0 0 0 0-4z",
  sun: "M8 2v1.5M8 12.5V14M2 8h1.5M12.5 8H14M3.8 3.8l1 1M11.2 11.2l1 1M3.8 12.2l1-1M11.2 4.8l1-1M8 5.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5z",
};

export function Icon({ name }: { name: keyof typeof PATHS | string }) {
  return (
    <svg className="icon" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
      <path d={PATHS[name]} />
    </svg>
  );
}
