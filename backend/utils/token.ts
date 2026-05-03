
function extractToken(authorizationHeader: any): string | null {
    if (!authorizationHeader) return null;

    // Try Bearer token format first
    const bearerRegex = /Bearer (.+)/i;
    const bearerMatches = authorizationHeader.match(bearerRegex);
    if (bearerMatches && bearerMatches.length === 2) {
        return bearerMatches[1];
    }
    return null;
}

export { extractToken }