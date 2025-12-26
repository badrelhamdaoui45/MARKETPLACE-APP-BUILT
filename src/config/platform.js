/**
 * Platform Configuration
 * Centralized settings for the marketplace platform
 */

export const PLATFORM_CONFIG = {
    /**
     * Commission Rate (as decimal)
     * Example: 0.10 = 10% commission on all transactions
     * Change this value to adjust platform-wide commission
     */
    COMMISSION_RATE: 0.10,

    /**
     * Platform Name
     */
    PLATFORM_NAME: 'PhotoMarket',

    /**
     * Currency
     */
    CURRENCY: 'USD',
    CURRENCY_SYMBOL: '$',
};

/**
 * Helper function to calculate commission amount
 * @param {number} totalAmount - The total transaction amount
 * @returns {number} The commission amount
 */
export const calculateCommission = (totalAmount) => {
    return totalAmount * PLATFORM_CONFIG.COMMISSION_RATE;
};

/**
 * Helper function to calculate net amount for photographer
 * @param {number} totalAmount - The total transaction amount
 * @returns {number} The net amount after commission
 */
export const calculateNetAmount = (totalAmount) => {
    return totalAmount - calculateCommission(totalAmount);
};
