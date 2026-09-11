export function getErrorText(err: unknown): string {
  if (!err) return "Error desconocido en la conexión";
  if (typeof err === "string") return err;
  if (typeof err === "object" && "message" in err) {
    return String((err as { message: unknown }).message);
  }
  return "Error desconocido en la conexión";
}