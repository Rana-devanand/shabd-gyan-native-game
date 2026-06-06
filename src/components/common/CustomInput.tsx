import React from "react";
import { Control, Controller } from "react-hook-form";
import { StyleSheet, Text, View } from "react-native";
import { TextInput, TextInputProps } from "react-native-paper";

interface Props extends TextInputProps {
  name: string;
  label: string;
  control: Control<any>;
  secure?: boolean;
  showToggle?: boolean;
  errorMessage?: string;
}

const CustomInput: React.FC<Props> = ({
  name,
  label,
  control,
  secure,
  showToggle,
  errorMessage,
  ...rest
}) => {
  const [showPassword, setShowPassword] = React.useState(false);

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>

      <Controller
        name={name}
        control={control}
        render={({ field: { value, onChange, onBlur } }) => (
          <TextInput
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            secureTextEntry={secure && !showPassword}
            mode="outlined"
            error={!!errorMessage}
            style={styles.input}               
            outlineStyle={styles.outlineStyle} 
            contentStyle={styles.contentStyle} 
            placeholderTextColor="#7E7E7E"
            theme={{
              fonts: {
                bodyLarge: {
                  fontFamily: "PlusJakartaSans_400Regular",
                },
              },
            }}
            right={
              secure && showToggle ? (
                <TextInput.Icon
                  icon={showPassword ? "eye-outline" : "eye-off-outline"}
                  onPress={() => setShowPassword(!showPassword)}
                  color="#7E7E7E"
                />
              ) : undefined
            }

            {...rest}
          />
        )}
      />

      {!!errorMessage && <Text style={styles.error}>{errorMessage}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
    width: "100%",
  },

  label: {
    fontSize: 14,
    fontFamily : "PlusJakartaSans_400Regular",
    color: "#7E7E7E",
    marginBottom: 10,
  },
  input: {
    fontFamily : "PlusJakartaSans_400Regular",
    backgroundColor: "#FAFAFA",
    height: 54,
  },
  outlineStyle: {
    borderWidth: 1.5,
    borderColor: "#E9E9E9",
    borderRadius : 10,
  },
  contentStyle: {
    fontSize: 14,
    color: "#111827",
    paddingVertical: 10,
  },

  error: {
    color: "#EF4444",
    fontSize: 12,
    marginTop: 4,
  },
});

export default CustomInput;
