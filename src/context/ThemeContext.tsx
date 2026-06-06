import { CustomDarkTheme, CustomLightTheme } from '@/src/constants/Colors';
import React, { createContext, useContext, useMemo, useState } from 'react';
import { Appearance } from 'react-native';

type ThemeType = 'light' | 'dark' | 'system';

const ThemeContext = createContext<{
    theme: ThemeType;
    setTheme: (theme: ThemeType) => void;
    navigationTheme: any;
}>({
    theme: 'system',
    setTheme: () => { },
    navigationTheme: CustomLightTheme,
});

export const ThemeProviderCustom: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [theme, setTheme] = useState<ThemeType>('dark');
    const colorScheme = Appearance.getColorScheme();

    const navigationTheme =
        theme === 'light'
            ? CustomLightTheme
            : theme === 'dark'
                ? CustomDarkTheme
                : colorScheme === 'dark'
                    ? CustomDarkTheme
                    : CustomLightTheme;

    const value = useMemo(() => ({ theme, setTheme, navigationTheme: CustomDarkTheme }), [theme, colorScheme]);

    return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useThemeContext = () => useContext(ThemeContext);