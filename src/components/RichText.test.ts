import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { RichText } from "./RichText";
import type { TopicModule } from "../topics/types";

describe("component references", () => {
  it("renders numbered components as selectable labels instead of raw markup", () => {
    const topic={parts:{consumer2:{name:{id:"Consumer kedua",en:"Second consumer"}}},glossary:{}} as unknown as TopicModule;
    const html=renderToStaticMarkup(createElement(RichText,{text:"Tambahkan {{consumer2|consumer C2}}.",lang:"id",selected:null,onPart:()=>{},topic}));
    expect(html).toContain('<button');
    expect(html).toContain('title="Consumer kedua"');
    expect(html).toContain('consumer C2</button>');
    expect(html).not.toContain('{{');
  });
});
