import { DarkTheme } from "@react-navigation/native";
import { NativeStackHeaderProps } from "@react-navigation/native-stack";
import { Appbar } from "react-native-paper";
import { useThemeContext } from "../context/ThemeContext";

type AppBarProps = {
    navigation: NativeStackHeaderProps['navigation'];
    back?: NativeStackHeaderProps['back'];
    options?: NativeStackHeaderProps['options'];
};
const AppBar = ({ navigation, back, options }: AppBarProps) => {
    const { theme, setTheme, navigationTheme } = useThemeContext();

    const canGoBack = navigation.canGoBack();
    const title = options?.title || "Title1";
    console.log({ title })
    const previousPage = back?.title || "Back";

    const handleBackPress = () => {
        if (canGoBack) {
            navigation.pop();
        }
    }

    const handleThemeChange = (theme: 'light' | 'dark') => {
        console.log("Changing theme to:", theme);
        setTheme(theme);
    }

    return (
        <Appbar.Header theme={DarkTheme} >

            {canGoBack && (
                <>
                    <Appbar.BackAction
                        theme={DarkTheme}
                        onPress={() => handleBackPress()}
                    />
                    <Appbar.Content title={previousPage} onPress={() => handleBackPress()} />
                </>
            )}
            <Appbar.Content title={title} theme={DarkTheme} />
            <Appbar.Action icon="white-balance-sunny" onPress={() => { handleThemeChange('dark') }} />

        </Appbar.Header>
    )
}

export default AppBar;