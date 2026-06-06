import Text from "@/src/components/ThemedText";
import { yupResolver } from "@hookform/resolvers/yup";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useForm } from "react-hook-form";
import { Platform, StyleSheet, TouchableOpacity, View } from "react-native";
import * as Yup from "yup";
import //   useResetPasswordMutation,
//   useVerfiyInvitationMutation,
"@/src/services/api";
import AuthWrapper from "../common/AuthWrapper";
import { AppTheme } from "@/src/constants/Colors";
import CustomInput from "../common/CustomInput";
import PasswordRequirement from "@/src/utils/PasswordRequirement";
import Toast from "react-native-toast-message";
import { Ionicons } from "@expo/vector-icons";

type FormData = {
  type: "reset-password" | "invite";
  password: string;
  confirmPassword: string;
  token: string | undefined;
  email?: string;
} & (
  | { type: "invite"; email: string } // email is required when type is "invite"
  | { type: "reset-password" }); // email is optional when type is "reset-password"

const schema = Yup.object().shape({
  password: Yup.string().min(8).required("Password is required"),
  confirmPassword: Yup.string()
    .oneOf([Yup.ref("password")], "Passwords must match")
    .required("Confirm Password is required"),
  token: Yup.string().required("Token is required"),
  type: Yup.string().oneOf(["reset-password", "invite"]).required(),
  email: Yup.string().when("type", {
    is: "invite",
    then: (schema) =>
      schema.email("Must be a valid email").required("Email is required"),
    otherwise: (schema) => schema.notRequired().email("Must be a valid email"),
  }),
});

const ResetPassword = () => {
  const { code, type } = useLocalSearchParams<{
    code?: string;
    type: "reset-password" | "invite";
  }>();
  const router = useRouter();
  //   const [resetPassword, { isLoading: isResetPassword }] =
  //     useResetPasswordMutation();
  //   const [verifyInvitation, { isLoading: isVerifyingInvitation }] =
  //     useVerfiyInvitationMutation();
  const {
    control,
    // handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    mode: "onTouched",
    defaultValues: {
      type: type as "reset-password" | "invite",
      password: "",
      confirmPassword: "",
      token: code || "",
      ...(type === "invite" ? { email: "" } : {}),
    },
    resolver: yupResolver(schema) as any,
  });

  //   const onSubmit = async (data: FormData) => {
  //     if (!code || !type) {
  //         Toast.show({
  //         type: "danger",
  //         text1: "Invalid request",
  //       });
  //       router.replace("/login");
  //       return;
  //     }
  //     const payload = {
  //       password: data.password,
  //       confirmPassword: data.confirmPassword,
  //       token: code,
  //     };
  //     const invitePayload = { ...payload, email: data.email };

  //     try {
  //       if (type === "reset-password") {
  //         // await resetPassword(payload).unwrap();
  //         Toast.show({
  //           type: "success",
  //           text1: "Password reset successfully",
  //         });
  //         router.replace("/login");
  //       } else if (type === "invite") {
  //         // await verifyInvitation(invitePayload).unwrap();
  //         Toast.show({
  //           type: "success",
  //           text1: "Invitation accepted successfully",
  //         });
  //         router.replace("/login");
  //       }
  //     } catch (err: any) {
  //       console.error(err);
  //       Toast.show({
  //         type: "danger",
  //         text1: err?.data?.message || "An error occurred",
  //       });
  //     }
  //   };

  const onSubmitForm = () => {
      console.log(type)
    if (type === "reset-password") {
      Toast.show({
        type: "success",
        text1: "Password reset successfully",
      });
      router.replace("/login");
    } else if (type === "invite") {
      Toast.show({
        type: "success",
        text1: "Invitation accepted successfully",
      });
      router.replace("/login");
    }
  };

  const passwordValue = watch("password") || "";
  const hasStartedTyping = passwordValue.length > 0;

  const inviteMember = type === "invite";

  // Todo dynamic data when invite member , ex -- (Hii Robert, Ella )
  const data = {
    title: inviteMember ? "My Household" : "Reset Password",
    subtitle: inviteMember
      ? "Hii Robert, Ella invited you to my household. You can only View the household. Create a password for your account"
      : "Create new password",
  };

  return (
    <AuthWrapper>
      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <Ionicons
          name="arrow-back"
          size={28}
          color={AppTheme.darkColors?.black}
        />
      </TouchableOpacity>
      <View style={styles.container}>
        <Text style={styles.title}>{data.title}</Text>
        <Text style={styles.subtitle}>{data.subtitle}</Text>
        {inviteMember && (
          <CustomInput
            name="email"
            control={control}
            label="Email Address"
            placeholder="Email address"
            autoCapitalize="none"
            keyboardType="email-address"
            errorMessage={errors.email?.message}
          />
        )}
        <CustomInput
          name="password"
          control={control}
          label="New Password"
          placeholder="********"
          secure
          showToggle
          errorMessage={errors.password?.message}
        />

        <CustomInput
          name="confirmPassword"
          control={control}
          label="Confirm Password"
          placeholder="********"
          secure
          showToggle
          errorMessage={errors.confirmPassword?.message}
        />

        <View style={styles.requirementsContainer}>
          <PasswordRequirement
            met={passwordValue.length >= 8}
            active={hasStartedTyping}
            text="8 characters minimum"
          />
          <PasswordRequirement
            met={/[A-Z]/.test(passwordValue)}
            active={hasStartedTyping}
            text="One uppercase letter"
          />
          <PasswordRequirement
            met={/[a-z]/.test(passwordValue)}
            active={hasStartedTyping}
            text="One lowercase letter"
          />
        </View>

        <TouchableOpacity
          //   onPress={handleSubmit(onSubmit)} // When API integrated run this
          onPress={onSubmitForm}
          style={styles.submitButton}
        >
          <Text style={styles.submitButtonText}>Confirm</Text>
        </TouchableOpacity>
      </View>
    </AuthWrapper>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    marginTop: Platform.OS === "android" ? 100 : 0,
  },
  backButton: {
    position: "absolute",
    top: Platform.OS === "android" ? 60 : 10,
    left: 25,
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
  requirementsContainer: {
    marginVertical: 8,
    marginLeft: 4,
  },
  submitButton: {
    backgroundColor: AppTheme?.lightColors?.primary,
    paddingVertical: 18,
    borderRadius: 8,
    alignItems: "center",
    marginVertical: 16,
  },
  submitButtonDisabled: {
    backgroundColor: "#93C5FD",
  },
  submitButtonText: {
    color: "#FFFFFF",
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontSize: 18,
  },
  input: {
    marginBottom: 10,
  },
  button: {
    marginTop: 15,
  },
});

export default ResetPassword;