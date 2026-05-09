import React, { createContext, useContext, useState, useEffect } from 'react';
import { en } from '../translations/en';
import { fr } from '../translations/fr';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

const LanguageContext = createContext();

export const LanguageProvider = ({ children }) => {
    const { user, profile } = useAuth();
    const [language, setLanguage] = useState('en');
    const translations = { en, fr };

    useEffect(() => {
        // 1. Check local storage first for quick load
        const savedLang = localStorage.getItem('app_language');
        if (savedLang && translations[savedLang]) {
            setLanguage(savedLang);
        }

        // 2. If user is logged in, sync with profile preference
        if (profile?.language && translations[profile.language]) {
            setLanguage(profile.language);
            localStorage.setItem('app_language', profile.language);
        }
    }, [profile]);

    const changeLanguage = async (newLang) => {
        if (!translations[newLang]) return;

        setLanguage(newLang);
        localStorage.setItem('app_language', newLang);

        // Update profile in DB if logged in
        if (user) {
            try {
                await supabase
                    .from('profiles')
                    .update({ language: newLang })
                    .eq('id', user.id);
            } catch (error) {
                console.error('Error updating language preference:', error);
            }
        }
    };

    const t = (key) => {
        return translations[language][key] || translations['en'][key] || key;
    };

    return (
        <LanguageContext.Provider value={{ language, changeLanguage, t }}>
            {children}
        </LanguageContext.Provider>
    );
};

export const useLanguage = () => {
    const context = useContext(LanguageContext);
    if (!context) {
        throw new Error('useLanguage must be used within a LanguageProvider');
    }
    return context;
};
