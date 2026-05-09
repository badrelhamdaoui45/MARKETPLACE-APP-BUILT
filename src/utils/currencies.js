export const currencies = [
    { code: 'USD', symbol: '$', name: 'US Dollar' },
    { code: 'EUR', symbol: '€', name: 'Euro' },
    { code: 'MAD', symbol: 'DH', name: 'Moroccan Dirham' },
    { code: 'GBP', symbol: '£', name: 'British Pound' },
    { code: 'CAD', symbol: 'CA$', name: 'Canadian Dollar' },
    { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
];

export const formatPrice = (amount, currencyCode = 'USD') => {
    const currency = currencies.find(c => c.code === currencyCode) || currencies[0];
    const formattedAmount = Number(amount).toFixed(2);
    
    // Position symbol based on currency (simple logic)
    if (currencyCode === 'MAD') {
        return `${formattedAmount} ${currency.symbol}`;
    }
    return `${currency.symbol}${formattedAmount}`;
};

export const getCurrencySymbol = (currencyCode = 'USD') => {
    const currency = currencies.find(c => c.code === currencyCode) || currencies[0];
    return currency.symbol;
};
