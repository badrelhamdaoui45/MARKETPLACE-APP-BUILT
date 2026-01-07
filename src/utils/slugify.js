
/**
 * Converts a string into an SEO-friendly slug.
 * Example: "Darbistes 2025" -> "darbistes-2025"
 */
export const slugify = (text) => {
    if (!text) return '';
    return text
        .toString()
        .toLowerCase()
        .normalize('NFD') // Normalize specialized characters
        .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
        .trim()
        .replace(/\s+/g, '-') // Replace spaces with hyphens
        .replace(/[^\w-]+/g, '') // Remove all non-word characters
        .replace(/--+/g, '-'); // Replace multiple hyphens with a single one
};
