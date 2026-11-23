import { useEffect, useRef } from "react";
import type { Lang } from "../content/topic";
import type { PartKey } from "../sim/scenarios";
import type { Sim } from "../sim/model";
import type { Runtime } from "../state/runtime";
import { FIGURE_LABEL, FigureDrawer } from "./drawer";

/** Loaded lazily: mounts the kit art once and lets the runtime draw on it every frame. */
export default function FigureStage({ runtime, lang, highlight, selected, onPart }: { runtime: Runtime; lang: Lang; highlight: PartKey[]; selected: PartKey | null; onPart: (part: PartKey | null) => void }) {
  const host = useRef<HTMLDivElement>(null);
  const drawer = useRef<FigureDrawer | null>(null);
  const onPartRef = useRef(onPart);
  onPartRef.current = onPart;

  useEffect(() => {
    const element = host.current!;
    const figure = new FigureDrawer(element);
    drawer.current = figure;
    const detach = runtime.addDrawer((sim, dt, info) => figure.draw(sim as Sim, dt, info));
    const onClick = (event: MouseEvent) => {
      const part = figure.partAt(event.target as Element);
      if (part) onPartRef.current(part);
    };
    element.addEventListener("click", onClick);
    return () => {
      element.removeEventListener("click", onClick);
      detach();
      element.innerHTML = "";
      drawer.current = null;
    };
  }, [runtime]);

  useEffect(() => {
    drawer.current?.setVisual({ highlight, selected });
  }, [highlight, selected]);

  useEffect(() => {
    drawer.current?.setLabel(FIGURE_LABEL[lang]);
  }, [lang]);

  return <div ref={host} className="figure-host" />;
}
