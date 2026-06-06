import { StyleSheet, Text as RNText, TextProps } from "react-native";
import { useTheme, useThemeMode } from "@rneui/themed";

export type ThemedTextProps = TextProps & {
  type?: "default" | "title" | "defaultSemiBold" | "subtitle" | "link";
};

const ThemedText = ({ style, type = "default", ...rest }: ThemedTextProps) => {
  const { theme } = useTheme();
  const { mode } = useThemeMode();

  const textColor = mode === "dark" ? theme.colors.white : theme.colors.black;
  return (
    <RNText
      style={[
        { color: textColor },
        type === "default" && styles.default,
        type === "title" && styles.title,
        type === "defaultSemiBold" && styles.defaultSemiBold,
        type === "subtitle" && styles.subtitle,
        type === "link" && [styles.link, { color: theme.colors.primary }],
        style,
      ]}
      {...rest}
    />
  );
};

const styles = StyleSheet.create({
  default: {
    fontSize: 16,
    lineHeight: 24,
  },
  defaultSemiBold: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: "600",
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    lineHeight: 32,
  },
  subtitle: {
    fontSize: 20,
    fontWeight: "bold",
  },
  link: {
    lineHeight: 30,
    fontSize: 16,
    textDecorationLine: "underline",
  },
});

export default ThemedText;
