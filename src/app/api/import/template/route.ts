import { requireUser, route } from "@/server/http";
import { templateCsv, templateWorkbook } from "@/lib/reports/export-builders";

export const GET = route(async (request) => {
  await requireUser();
  const format = request.nextUrl.searchParams.get("format") === "xlsx" ? "xlsx" : "csv";
  if (format === "xlsx") {
    return new Response(new Uint8Array(await templateWorkbook()), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": 'attachment; filename="modelo-importacao.xlsx"',
        "Cache-Control": "no-store",
      },
    });
  }
  return new Response(templateCsv(), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="modelo-importacao.csv"',
      "Cache-Control": "no-store",
    },
  });
});
