import CustomInput from "@/src/components/common/CustomInput";
import Text from "@/src/components/ThemedText";
import { useLoginMutation } from "@/src/services/api";
import { yupResolver } from "@hookform/resolvers/yup";
import { useRouter } from "expo-router";
import React from "react";
import { useForm } from "react-hook-form";
import {
  Image,
  Platform,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import {  Divider } from "react-native-paper";
import * as yup from "yup";
import AuthWrapper from "../common/AuthWrapper";
import { AppTheme } from "@/src/constants/Colors";
import { AntDesign } from "@expo/vector-icons";
import Toast from "react-native-toast-message";
// Import your custom password field or implement below
// import AppleLogin from './AppleLogin';
// import GoogleLogin from './GoogleLogin';
// import FBLogin from './FBLogin';
// import LinkedInLogin from './LinkedInLogin';

const schema = yup.object({
  email: yup.string().email("Email is invalid").required("Email is required"),
  password: yup
    .string()
    .required("Password is required")
    .min(8, "Minimum 8 chars required")
    .max(16, "Maximum 16 chars allowed"),
});

type FormData = yup.InferType<typeof schema>;

export default function Login() {
  const router = useRouter();
  const [loginUser, { isLoading }] = useLoginMutation();
  const {
    control,
    handleSubmit,
    getValues,
    formState: { errors, isValid, isSubmitting },
  } = useForm<FormData>({
    defaultValues: { email: "", password: "" },
    resolver: yupResolver(schema),
  });

  // const onSubmit = async (data: FormData) => {
  //   try {
  //     // await loginUser(data).unwrap()
  //     router.replace("/(authenticated)/(tabs)");
  //     showMessage({
  //       message: "Login successful",
  //       type: "success",
  //     });
  //   } catch (error: any) {
  //     console.log("Login error:", error);
  //     showMessage({
  //       message: error?.data?.message || "Login failed",
  //       type: "danger",
  //     });
  //   }
  // };
  const onSubmit = () => {
    router.replace("/(authenticated)/(tabs)");
    Toast.show({
      type: "success",
      text1: "Login successful",
    });
  }
  return (
    <AuthWrapper>
      <View style={styles.container}>
        <Text style={styles.title}>Login to your account</Text>
        <Text style={styles.subtitle}>Fill in this form to login</Text>
        <CustomInput
          label={"Email Address/ Username"}
          name="email"
          mode="outlined"
          placeholder="Email address or username"
          control={control}
          errorMessage={errors.email?.message}
          autoCapitalize="none"
          keyboardType="email-address"
        />

        <CustomInput
          name="password"
          control={control}
          label="Password"
          placeholder="********"
          secure
          showToggle
          errorMessage={errors.password?.message}
        />
        <TouchableOpacity
          style={styles.forgetPassword}
          onPress={() => {
            router.push({
              pathname: "/forgot-password",
              params: {
                email: getValues("email") || "",
              },
            });
          }}
        >
          <Text style={{ color: AppTheme.lightColors?.primary }}>
            Forgot password
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={onSubmit}
          style={styles.button}
          disabled={!isValid || isSubmitting || isLoading}
        >
          <Text style={styles.logIn}>Log in</Text>
        </TouchableOpacity>

        <View style={styles.dividerContainer}>
          <Divider
            style={{
              flex: 1,
              height: 1,
            }}
          />
          <Text style={styles.loginWith}>Or login with</Text>
          <Divider style={{ flex: 1, height: 1 }} />
        </View>

        <View style={styles.socialContainer}>
          <TouchableOpacity style={styles.socialButton}>
            <Image
              style={styles.google}
              source={require("@/assets/images/png/google.png")}
            />
            <Text style={styles.socialButtonText}>Google</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.socialButton}>
            <AntDesign
              name="apple1"
              size={20}
              color={AppTheme?.darkColors?.black}
            />
            <Text style={styles.socialButtonText}>Apple</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.linkContainer}>
          <Text style={styles.link}>Don&apos;t have an account? </Text>
          <TouchableOpacity
            onPress={() => {
              router.push("/sign-up");
            }}
          >
            <Text style={styles.linkText}>Create Account</Text>
          </TouchableOpacity>
        </View>
      </View>
    </AuthWrapper>
  );
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: "100%",
    maxWidth: 500,
    alignSelf: "center",
    marginTop: Platform.OS === "android" ? 130 : 0,
  },
  title: {
    textAlign: "center",
    fontSize: 20,
    fontFamily: "PlusJakartaSans_600SemiBold",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: "PlusJakartaSans_400Regular",
    color: AppTheme.lightColors?.grey5,
    textAlign: "center",
    marginBottom: 30,
  },
  forgetPassword: {
    color: AppTheme.lightColors?.primary,
    alignItems: "flex-end",
    paddingBottom: 30,
    paddingTop: 10,
  },
  button: {
    backgroundColor: AppTheme.lightColors?.primary,
    paddingVertical: 18,
    borderRadius: 12,
    alignItems: "center",
  },
  logIn: {
    color: AppTheme.lightColors?.white,
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontWeight: "bold",
    fontSize: 18,
  },
  dividerContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 20,
  },
  loginWith: {
    color: AppTheme.lightColors?.grey4,
    marginHorizontal: 12,
  },
  socialContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  socialButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderWidth: 1.5,
    backgroundColor: "#FAFAFA",
    borderColor: "#E9E9E9",
    borderRadius: 999,
    marginHorizontal: 8,
  },
  google: {
    width: 20,
    height: 20,
  },
  socialButtonText: {
    marginLeft: 8,
    fontSize: 14,
    fontFamily: "PlusJakartaSans_600SemiBold",
    color: "#7E7E7E",
  },
  linkContainer: {
    flexDirection: "row",
    marginTop: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  link: {
    color: AppTheme?.darkColors?.grey4,
    marginVertical: 6,
    fontFamily: "PlusJakartaSans_400Regular",
  },
  linkText: {
    color: AppTheme.lightColors?.primary,
    fontFamily: "PlusJakartaSans_600SemiBold",
  },
});
