import path from "node:path";
import { desc } from "drizzle-orm";
import { importFileAction, removeDemoAction } from "@/app/actions";
import { Flash, PageHeader, Section } from "@/components/ui";
import { getDb, resolveDbFile, resolveUploadDir, schema } from "@/db/client";
import { getT } from "@/i18n/server";
import { hasDemo } from "@/server/demo";
import { rich } from "@/i18n/rich";
import { makeFormat } from "@/lib/format";

export async function generateMetadata() {
  const { t } = await getT();
  return { title: t("nav.data") };
}

export default async function DataPage({ searchParams }: { searchParams: Promise<{ ok?: string; err?: string }> }) {
  const { ok, err } = await searchParams;
  const { t, locale } = await getT();
  const f = makeFormat(locale);
  const strong = (c: React.ReactNode) => <strong className="text-fg">{c}</strong>;
  const mono = (c: React.ReactNode) => <span className="mono">{c}</span>;
  const dataDir = path.dirname(resolveDbFile());
  const uploadDir = resolveUploadDir();
  const uploadsOutside = path.relative(dataDir, uploadDir).startsWith("..") || path.isAbsolute(path.relative(dataDir, uploadDir));
  const auditTrail =getDb().select().from(schema.auditEvents).orderBy(desc(schema.auditEvents.id)).limit(60).all();
  return (
    <>
      <PageHeader eyebrow={t("data.eyebrow")} title={t("nav.data")} sub={t("data.sub")} />
      <Flash ok={ok} err={err} />
      <div className="grid gap-5 xl:grid-cols-3">
        <Section title={t("data.export.title")}>
          <div className="space-y-2">
            <a href="/api/export?format=json" className="btn w-full justify-start">{t("data.export.json")} <span className="ml-auto text-xs text-faint">{t("data.export.jsonHint")}</span></a>
            <a href="/api/export?format=csv-profiles" className="btn w-full justify-start">{t("data.export.csvProfiles")} <span className="ml-auto text-xs text-faint">{t("data.export.csvProfilesHint")}</span></a>
            <a href="/api/export?format=csv-spools" className="btn w-full justify-start">{t("data.export.csvSpools")} <span className="ml-auto text-xs text-faint">{t("data.export.csvSpoolsHint")}</span></a>
          </div>
          <p className="mt-3 text-xs text-muted">{t("data.export.csvNote")}</p>
        </Section>
        <Section title={t("data.import.title")}>
          <form action={importFileAction} className="space-y-3">
            <input type="file" name="file" required accept=".json,.csv,application/json,text/csv" aria-label={t("data.import.fileAria")} className="input file:mr-3 file:rounded file:border-0 file:bg-raised file:px-2 file:py-1 file:text-xs file:text-fg" />
            <button className="btn btn-primary">{t("data.import.submit")}</button>
          </form>
          <ul className="mt-3 list-inside list-disc space-y-1 text-xs text-muted">
            <li>{rich(t("data.import.jsonHelp"), [strong])}</li>
            <li>{rich(t("data.import.csvHelp"), [strong, mono])}</li>
          </ul>
        </Section>
        <Section title={t("data.backup.title")}>
          <dl className="space-y-3 text-sm">
            <div><dt className="text-muted">{t("data.backup.folder")}</dt><dd className="mono mt-1 break-all rounded-lg border border-line bg-bg px-3 py-2 text-xs">{dataDir}</dd></div>
            {uploadsOutside ? <div><dt className="text-muted">{t("data.backup.uploadsFolder")}</dt><dd className="mono mt-1 break-all rounded-lg border border-line bg-bg px-3 py-2 text-xs">{uploadDir}</dd></div> : null}
          </dl>
          <a href="/api/backup" className="btn btn-primary mt-3 w-full justify-center">{t("data.backup.download")}</a>
          <ul className="mt-3 list-inside list-disc space-y-1 text-xs text-muted">
            <li>{t("data.backup.downloadHelp")}</li>
            <li>{rich(t("data.backup.fullHelp"), [strong])}</li>
            <li>{rich(t("data.backup.restoreHelp"), [strong, mono])}</li>
          </ul>
        </Section>
        <Section title={t("demo.remove.title")}>
          <p className="text-sm leading-relaxed text-muted">{t("demo.remove.body")}</p>
          {hasDemo() ? (
            <form action={removeDemoAction} className="mt-3"><button type="submit" className="btn btn-danger">{t("demo.remove.button")}</button></form>
          ) : <p className="mt-3 text-xs text-faint">{t("demo.remove.none")}</p>}
        </Section>
        <Section title={t("data.audit.title")} className="xl:col-span-3">
          <div className="overflow-x-auto">
            <table className="tbl">
              <thead><tr><th>{t("data.audit.at")}</th><th>{t("data.audit.entity")}</th><th>{t("data.audit.action")}</th><th>{t("data.audit.summary")}</th></tr></thead>
              <tbody>{auditTrail.map((a) => <tr key={a.id}><td className="whitespace-nowrap text-muted">{f.dateTime(a.at)}</td><td><span className="badge">{t(`audit.entity.${a.entity}`)}{a.entityId ? ` #${a.entityId}` : ""}</span></td><td className="mono text-xs text-muted">{a.action}</td><td>{a.summary}</td></tr>)}</tbody>
            </table>
          </div>
        </Section>
      </div>
    </>
  );
}
