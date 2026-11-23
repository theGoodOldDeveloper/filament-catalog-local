// Fordítás beágyazott elemekkel (link, kiemelés): a szótári szöveg `<0>…</0>` jelölést tartalmaz,
// a hívó megadja, mit kell a jelölt részből csinálni.
//   rich(t("catalog.empty.hint"), [(c) => <Link href="/filaments/new">{c}</Link>])
// A jelölés számozott, hogy a fordítás szórendje szabadon változhasson.

import { Fragment, type ReactNode } from "react";

export function rich(text: string, parts: ((children: ReactNode) => ReactNode)[]): ReactNode {
  const out: ReactNode[] = [];
  const re = /<(\d+)>(.*?)<\/\1>/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const wrap = parts[Number(m[1])];
    out.push(<Fragment key={m.index}>{wrap ? wrap(m[2]) : m[2]}</Fragment>);
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}
