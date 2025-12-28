/**
 * Sanitizes a filename for use as a storage key.
 * Removes special characters and replaces spaces with underscores.
 */
export const sanitizeFileName = (fileName) => {
    if (!fileName) return `file-${Date.now()}`;

    // Get extension
    const parts = fileName.split('.');
    const ext = parts.length > 1 ? parts.pop() : '';
    const name = parts.join('.');

    // Sanitize name: remove non-alphanumeric except hyphens/underscores, replace spaces with underscores
    const cleanName = name
        .toLowerCase()
        .replace(/\s+/g, '_')
        .replace(/[^a-z0-9-_]/g, '')
        .substring(0, 100); // Limit length

    return ext ? `${cleanName}.${ext}` : cleanName;
};
