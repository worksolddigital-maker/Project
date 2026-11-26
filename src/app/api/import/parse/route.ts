import { suggestMapping } from "@/lib/domain/import-mapping";
import { ApiError, json, requireUser, route } from "@/server/http";
import { MAX_IMPORT_BYTES, parseImportFile } from "@/server/services/import";

export const POST = route(async (request) => {
  await requireUser();
  const length = Number(request.headers.get("content-length") ?? 0);
  if (length > MAX_IMPORT_BYTES + 64 * 1024) throw new ApiError(413, "Arquivo maior que 8 MB.");
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    throw new ApiError(400, "Envie o arquivo pelo formulário de importação.");
  }
  const file = form.get("file");
  if (!(file instanceof File)) throw new ApiError(422, "Selecione um arquivo.");
  const sheet = await parseImportFile(file);
  return json({ ...sheet, fileName: file.name, mapping: suggestMapping(sheet.headers) });
});
