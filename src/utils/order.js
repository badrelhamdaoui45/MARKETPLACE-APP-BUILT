/**
 * Generates a unique order number for transactions.
 * Format: ORD-YYYYMMDD-XXXX where XXXX is a random alphanumeric string.
 */
export const generateOrderNumber = () => {
    const now = new Date();
    const dateStr = now.getFullYear().toString() + 
                    (now.getMonth() + 1).toString().padStart(2, '0') + 
                    now.getDate().toString().padStart(2, '0');
    
    // Generate 4 random alphanumeric characters
    const randomChars = Math.random().toString(36).substring(2, 6).toUpperCase();
    
    return `ORD-${dateStr}-${randomChars}`;
};

/**
 * Copies text to clipboard.
 */
export const copyToClipboard = async (text) => {
    try {
        await navigator.clipboard.writeText(text);
        return true;
    } catch (err) {
        console.error('Failed to copy: ', err);
        return false;
    }
};
