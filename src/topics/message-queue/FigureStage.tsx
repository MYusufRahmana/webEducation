import { useEffect, useRef } from "react";
import type { FigureStageProps } from "../types";
import type { MqSim } from "./model";
import { MQ_FIGURE_LABEL, MqDrawer } from "./drawer";

/** Loaded lazily: mounts the message-queue art once and lets the runtime draw on it every frame. */
export default function FigureStage({ runtime, lang, highlight, selected, onPart }: FigureStageProps) {
  const host = useRef<HTMLDivElement>(null);
  const drawer = useRef<MqDrawer | null>(null);
  const onPartRef = useRef(onPart);
  onPartRef.current = onPart;

  useEffect(() => {
    const element = host.current!;
    const figure = new MqDrawer(element);
    drawer.current = figure;
    const detach = runtime.addDrawer((sim, dt, info) => figure.draw(sim as unknown as MqSim, dt, info));
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
    drawer.current?.setLabel(MQ_FIGURE_LABEL[lang]);
  }, [lang]);

  return <div ref={host} className="figure-host" />;
}
