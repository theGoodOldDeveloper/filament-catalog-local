// Szerveroldali hibák nyelvfüggetlenül. A szolgáltatások (src/server/*) NEM dobnak beégetett szöveget:
//   throw new AppError("stock.error.spoolNotFound");
// Zod-üzenetként: z.string().refine(..., appMsg("validation.invalidDate"))
// A határon (Server Action / route) fordítjuk: translateError(e, t).

import { ZodError } from "zod";
import type { Params, TFn } from "./core";

export class AppError extends Error {
  constructor(public readonly key: string, public readonly params?: Params) {
    super(key);
    this.name = "AppError";
  }
}

const PREFIX = "@@app:";

/** Zod-üzenetbe ágyazható kulcs + paraméterek (a Zod csak stringet enged). */
export const appMsg = (key: string, params?: Params): string => PREFIX + JSON.stringify({ k: key, p: params });

function decode(msg: string, t: TFn): string {
  if (!msg.startsWith(PREFIX)) return msg;
  try {
    const { k, p } = JSON.parse(msg.slice(PREFIX.length)) as { k: string; p?: Params };
    return t(k, p);
  } catch {
    return msg;
  }
}

/** Egy elkapott hiba → lefordított üzenetek listája. A még nem átalakított egyszerű Error üzenete változatlanul átmegy. */
export function translateError(e: unknown, t: TFn): string[] {
  if (e instanceof AppError) return [t(e.key, e.params)];
  if (e instanceof ZodError) return [...new Set(e.issues.map((i) => decode(i.message, t)))].slice(0, 8);
  if (e instanceof Error) return [decode(e.message, t)];
  return [t("error.unknown")];
}
