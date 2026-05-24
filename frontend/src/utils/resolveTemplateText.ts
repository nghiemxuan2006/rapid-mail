/**
 * Replaces [FieldName] and {{FieldName || "fallback"}} variables in email templates.
 * @param text    Raw template string (may contain HTML)
 * @param fields  Map of field name → value from recipient data
 */
export function resolveTemplateText(text: string, fields: Record<string, string>): string {
    let resolved = text;
    Object.entries(fields).forEach(([key, value]) => {
        resolved = resolved.replace(
            new RegExp(`\\[${key}\\]`, 'g'),
            value ? `<strong>${value}</strong>` : `[${key}]`,
        );
        resolved = resolved.replace(
            new RegExp(`\\{\\{${key}\\s*\\|\\|\\s*['"]([^'"]+)['"]\\}\\}`, 'g'),
            (_match, fallback) => `<strong>${value || fallback}</strong>`,
        );
    });
    return resolved;
}
