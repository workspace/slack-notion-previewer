export function buildNotionAppUrl(pageId: string): string {
    const pageIdWithoutDash = pageId.replace(/-/g, "");
    return `notion://notion.so/${pageIdWithoutDash}`
}

export function buildNotionWebUrl(pageId: string): string {
    const pageIdWithoutDash = pageId.replace(/-/g, "");
    return `https://notion.so/${pageIdWithoutDash}`
}