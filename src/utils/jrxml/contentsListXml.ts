// JRXML for a contents list: a frame (its setup in CONTENTS_LIST_PROPERTY)
// holding, per row, the number, the title (one line high, followed by leader
// dots that are cut at the end of the line) and the page, right-aligned.

import type { ContentsListElement } from "@/types";
import { resolveReportFont } from "@/config/fonts.config";
import {
  CONTENTS_LIST_PROPERTY,
  LEADER_DOTS,
  listNumbers,
  serializeContentsList,
  SIDE_PAD,
  SUB_INDENT,
  titleLineHeight,
  type NumberStart,
} from "../contentsList";
import { javaString } from "./tableXml";
import { cdata, xmlAttr } from "./xmlEscape";

const r = (n: number) => Math.round(n);

// Stable ids from the list's own id, so the JRXML only changes when the list does
function idMaker(base: string | undefined) {
  const prefix = (base && /^[0-9a-f-]{36}$/i.test(base) ? base : "00000000-0000-4000-8000-000000000000").slice(0, 24);
  let n = 0;
  return () => `${prefix}${(++n).toString(16).padStart(12, "0")}`;
}

interface FieldOptions {
  x: number;
  y: number;
  width: number;
  height: number;
  text: string;
  bold: boolean;
  align: "Left" | "Center" | "Right";
  color: string;
  fill?: string;
  // The heading's bookmark this row jumps to in the PDF
  link?: string;
}

export function generateContentsListXML(
  element: ContentsListElement,
  reportElementAttrs: string,
  // Where automatic numbers start (a list carrying another one on)
  start?: NumberStart,
  // Per row: the bookmark of the heading it stands for (clickable in the PDF)
  links: (string | undefined)[] = [],
): string {
  const list = element.list;
  const numbers = listNumbers(list, start);
  const id = idMaker(element.uuid);
  const font = resolveReportFont(undefined);
  const lineHeight = Math.min(list.rowHeight, titleLineHeight(list.fontSize));
  const top = (list.rowHeight - lineHeight) / 2;

  const field = (o: FieldOptions) => {
    let attrs = ` x="${r(o.x)}" y="${r(o.y)}" width="${r(Math.max(1, o.width))}" height="${r(o.height)}" uuid="${id()}"`;
    attrs += o.fill ? ` mode="Opaque" backcolor="${xmlAttr(o.fill)}"` : ` mode="Transparent"`;
    attrs += ` forecolor="${xmlAttr(o.color)}"`;
    const linked = o.link ? ` hyperlinkType="LocalAnchor"` : "";
    return (
      `<textField${linked}><reportElement${attrs}/>` +
      `<textElement textAlignment="${o.align}" verticalAlignment="Middle" markup="none">` +
      `<font fontName="${xmlAttr(font)}" size="${xmlAttr(list.fontSize)}"${o.bold ? ' isBold="true"' : ""}/></textElement>` +
      `<textFieldExpression>${cdata(javaString(o.text))}</textFieldExpression>` +
      (o.link ? `<hyperlinkAnchorExpression>${cdata(javaString(o.link))}</hyperlinkAnchorExpression>` : "") +
      `</textField>`
    );
  };

  let xml = `<frame><reportElement${reportElementAttrs} mode="Transparent">`;
  xml += `<property name="${CONTENTS_LIST_PROPERTY}" value="${xmlAttr(serializeContentsList(list))}"/>`;
  // Its other properties (e.g. being part of a box)
  for (const p of element.properties ?? []) {
    if (p?.name && p.name !== CONTENTS_LIST_PROPERTY) {
      xml += `<property name="${xmlAttr(p.name)}" value="${xmlAttr(p.value ?? "")}"/>`;
    }
  }
  xml += `</reportElement>`;
  const width = element.width;
  list.entries.forEach((entry, i) => {
    const y = i * list.rowHeight;
    const bold = entry.level === 0 && list.boldSections;
    const indent = entry.level === 1 ? SUB_INDENT : 0;
    const number = numbers[i] ?? "";
    const link = links[i];
    if (list.numberWidth > 0 && number) {
      const boxed = !!list.numberFill && entry.level === 0;
      xml += field({
        x: SIDE_PAD + indent,
        y: boxed ? y + 1 : y + top,
        width: boxed ? Math.min(list.numberWidth - 6, list.rowHeight * 1.6) : list.numberWidth - 4,
        height: boxed ? list.rowHeight - 2 : lineHeight,
        text: number,
        bold,
        align: boxed ? "Center" : "Left",
        color: boxed ? (list.numberColor ?? "#FFFFFF") : list.color,
        fill: boxed ? list.numberFill : undefined,
        link,
      });
    }
    const titleX = SIDE_PAD + list.numberWidth + indent;
    xml += field({
      x: titleX,
      y: y + top,
      width: width - titleX - list.pageWidth - SIDE_PAD,
      height: lineHeight,
      text: entry.title + (list.leader ? LEADER_DOTS : ""),
      bold,
      align: "Left",
      color: list.color,
      link,
    });
    xml += field({
      x: width - list.pageWidth - SIDE_PAD,
      y: y + top,
      width: list.pageWidth,
      height: lineHeight,
      text: entry.page,
      bold,
      align: "Right",
      color: list.color,
      link,
    });
  });
  return xml + `</frame>`;
}
