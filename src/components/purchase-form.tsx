"use client";

import Link from "next/link";
import { useActionState, useMemo, useState } from "react";
import { createPurchaseAction, type FormState } from "@/app/actions";
import { INTL_LOCALE } from "@/i18n/core";
import { useLocale, useT } from "@/i18n/client";
import { rich } from "@/i18n/rich";

export interface ProfileOption { id: number; label: string; search: string; netWeightG: number | null }
interface Item { profileId: string; variant: string; quantity: string; unitPrice: string; shippingShare: string; discountShare: string }
const blank = (): Item => ({ profileId: "", variant: "", quantity: "1", unitPrice: "", shippingShare: "", discountShare: "" });
const n = (s: string) => (s.trim() === "" ? null : Number(s.replace(",", ".")));

export function PurchaseForm({ profiles, today }: { profiles: ProfileOption[]; today: string }) {
  const t = useT();
  const locale = useLocale();
  const [state, action, pending] = useActionState<FormState, FormData>(createPurchaseAction, { errors: [] });
  const [items, setItems] = useState<Item[]>([blank()]);
  const [shipping, setShipping] = useState("");
  const [discount, setDiscount] = useState("");
  const [currency, setCurrency] = useState("HUF");
  const [filter, setFilter] = useState("");
  const v = (k: string, d = "") => state.values?.[k] ?? d;
  const set = (i: number, patch: Partial<Item>) => setItems((xs) => xs.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  const options = useMemo(() => {
    const q = filter.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").split(/\s+/).filter(Boolean);
    return profiles.filter((p) => q.every((tok) => p.search.includes(tok)) || items.some((i) => i.profileId === String(p.id)));
  }, [profiles, filter, items]);

  const qty = items.reduce((a, i) => a + (Number(i.quantity) || 0), 0);
  const allPriced = items.every((i) => n(i.unitPrice) !== null);
  const value = items.reduce((a, i) => a + (n(i.unitPrice) ?? 0) * (Number(i.quantity) || 0), 0);
  const total = allPriced ? value + (n(shipping) ?? 0) - (n(discount) ?? 0) : null;
  const money = (x: number) => new Intl.NumberFormat(INTL_LOCALE[locale], { maximumFractionDigits: 2 }).format(x) + " " + currency;

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="items" value={JSON.stringify(items)} />
      {state.errors.length > 0 && (
        <div role="alert" className="rounded-xl border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger"><ul className="list-inside list-disc">{state.errors.map((e) => <li key={e}>{e}</li>)}</ul></div>
      )}

      <section className="card">
        <h2 className="mb-4 text-base font-semibold">{t("purchase.form.transaction")}</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <label><span className="label">{t("purchase.form.date")}</span><input type="date" name="purchasedAt" defaultValue={v("purchasedAt", today)} className="input" /></label>
          <label><span className="label">{t("purchase.form.seller")}</span><input name="seller" defaultValue={v("seller")} className="input" /></label>
          <label><span className="label">{t("purchase.form.orderReference")}</span><input name="orderReference" defaultValue={v("orderReference")} className="input mono" /></label>
          <label><span className="label">{t("purchase.form.currency")}</span><input name="currency" value={currency} onChange={(e) => setCurrency(e.target.value.toUpperCase().slice(0, 3))} className="input mono" pattern="[A-Za-z]{3}" required /></label>
          <label><span className="label">{t("purchase.form.shipping")}</span><input name="shippingTotal" inputMode="decimal" value={shipping} onChange={(e) => setShipping(e.target.value)} className="input" placeholder={t("purchase.form.ifKnown")} /></label>
          <label><span className="label">{t("purchase.form.discount")}</span><input name="discountTotal" inputMode="decimal" value={discount} onChange={(e) => setDiscount(e.target.value)} className="input" placeholder={t("purchase.form.ifKnown")} /></label>
          <label><span className="label">{t("purchase.form.orderTotal")}</span><input name="orderTotal" inputMode="decimal" defaultValue={v("orderTotal")} className="input" placeholder={total !== null ? t("purchase.form.computed", { amount: money(total) }) : t("purchase.form.ifKnown")} /></label>
          <label><span className="label">{t("purchase.form.receivedAt")}</span><input type="date" name="receivedAt" defaultValue={v("receivedAt")} className="input" /></label>
          <label className="sm:col-span-2"><span className="label">{t("purchase.form.location")}</span><input name="location" defaultValue={v("location")} className="input" placeholder={t("spool.locationPlaceholder")} /></label>
          <label className="sm:col-span-2"><span className="label">{t("common.note")}</span><input name="notes" defaultValue={v("notes")} className="input" /></label>
        </div>
      </section>

      <section className="card">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-base font-semibold">{t("purchase.form.items")} <span className="ml-2 text-sm font-normal text-muted">{t("purchase.form.itemsCreated", { count: qty })}</span></h2>
          <input type="search" value={filter} onChange={(e) => setFilter(e.target.value)} placeholder={t("purchase.form.filterPlaceholder")} aria-label={t("purchase.form.filterAria")} className="input max-w-xs !py-1.5" data-noauto />
        </div>
        {profiles.length === 0 && <p className="mb-3 text-sm text-warn">{rich(t("purchase.form.noProfiles"), [(c) => <Link className="link" href="/filaments/new">{c}</Link>])}</p>}
        <div className="space-y-3">
          {items.map((it, i) => (
            <div key={i} className="grid gap-2 rounded-xl border border-line bg-bg/40 p-3 sm:grid-cols-12">
              <label className="sm:col-span-5"><span className="label">{t("purchase.form.profile")}</span>
                <select className="input" value={it.profileId} onChange={(e) => set(i, { profileId: e.target.value })} required>
                  <option value="">{t("common.choose")}</option>
                  {options.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
                </select>
              </label>
              <label className="sm:col-span-2"><span className="label">{t("purchase.form.variant")}</span><input className="input" value={it.variant} onChange={(e) => set(i, { variant: e.target.value })} placeholder={t("purchase.form.optional")} /></label>
              <label className="sm:col-span-1"><span className="label">{t("purchase.form.qty")}</span><input className="input" type="number" min={1} max={200} value={it.quantity} onChange={(e) => set(i, { quantity: e.target.value })} required /></label>
              <label className="sm:col-span-2"><span className="label">{t("purchase.form.unitPrice")}</span><input className="input" inputMode="decimal" value={it.unitPrice} onChange={(e) => set(i, { unitPrice: e.target.value })} placeholder={t("purchase.form.ifKnown")} /></label>
              <label className="sm:col-span-1"><span className="label" title={t("purchase.form.shipShareTitle")}>{t("purchase.form.shipShare")}</span><input className="input" inputMode="decimal" value={it.shippingShare} onChange={(e) => set(i, { shippingShare: e.target.value })} /></label>
              <div className="flex items-end sm:col-span-1"><button type="button" className="btn btn-ghost btn-sm w-full" disabled={items.length === 1} onClick={() => setItems((xs) => xs.filter((_, j) => j !== i))} aria-label={t("purchase.form.itemDeleteAria", { n: i + 1 })}>✕</button></div>
            </div>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <button type="button" className="btn btn-sm" onClick={() => setItems((xs) => [...xs, blank()])}>{t("purchase.form.addItem")}</button>
          <p className="text-xs text-muted">
            {rich(t("purchase.form.itemsValue", { value: allPriced ? money(value) : t("purchase.form.partlyUnknown") }), [(c) => <span className="font-medium text-fg">{c}</span>])}
            {total !== null && <> · {rich(t("purchase.form.computedTotal", { total: money(total) }), [(c) => <span className="font-medium text-fg">{c}</span>])}</>}
            <span className="ml-2 text-faint">{t("purchase.form.proratedNote")}</span>
          </p>
        </div>
      </section>

      <div className="flex justify-end gap-2">
        <Link href="/purchases" className="btn btn-ghost">{t("common.cancel")}</Link>
        <button className="btn btn-primary" disabled={pending || profiles.length === 0}>{pending ? t("common.saving") : t("purchase.form.submit")}</button>
      </div>
    </form>
  );
}
