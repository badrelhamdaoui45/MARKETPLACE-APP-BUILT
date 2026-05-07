export const MOROCCAN_BANKS = [
    { name: 'CIH Bank', domain: 'cihbank.ma' },
    { name: 'Attijariwafa Bank', domain: 'attijariwafabank.com' },
    { name: 'Bank of Africa (BMCE)', domain: 'bankofafrica.ma' },
    { name: 'Banque Populaire (BCP)', domain: 'groupebcp.com' },
    { name: 'Société Générale', domain: 'societegenerale.ma' },
    { name: 'Crédit Agricole (CAM)', domain: 'creditagricole.ma' },
    { name: 'Crédit du Maroc', domain: 'cdm.co.ma' },
    { name: 'Al Barid Bank', domain: 'albaridbank.ma' },
    { name: 'CFG Bank', domain: 'cfgbank.com' },
    { name: 'Other', domain: null }
];

export const getBankLogoUrl = (bankName) => {
    const bank = MOROCCAN_BANKS.find(b => b.name === bankName);
    if (bank && bank.domain) {
        return `https://logo.clearbit.com/${bank.domain}`;
    }
    return null;
};
