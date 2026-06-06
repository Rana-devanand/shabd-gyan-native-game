import { View as RNView, ViewProps } from "react-native";
import { useTheme } from "@rneui/themed";

export type ThemedViewProps = ViewProps & {
  lightColor?: string;
  darkColor?: string;
};

const ThemedView = ({ style, lightColor, darkColor, ...otherProps }: ThemedViewProps) => {
  const { theme } = useTheme();

  return (
    <RNView
      style={[
        { backgroundColor: theme.colors.background },
        style,
      ]}
      {...otherProps}
    />
  );
};

export default ThemedView;
