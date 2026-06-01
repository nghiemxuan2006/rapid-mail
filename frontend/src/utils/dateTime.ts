export function utcToLocal(utcString: string): string {
    const date = new Date(utcString);
    return date.toLocaleString();
}

export function utcToLocalDate(utcString: string): string {
    const date = new Date(utcString);
    return date.toLocaleDateString();
}

export function utcToLocalTime(utcString: string): string {
    const date = new Date(utcString);
    return date.toLocaleTimeString();
}
