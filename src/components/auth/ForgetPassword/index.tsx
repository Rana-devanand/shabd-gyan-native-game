
import { yupResolver } from '@hookform/resolvers/yup';
import { useLocalSearchParams, useRouter } from "expo-router";
import React from 'react';
import { useForm } from 'react-hook-form';
import { Platform, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Button, Text } from 'react-native-paper';
import * as yup from 'yup';
import AuthWrapper from '../../common/AuthWrapper';
import { AppTheme } from '@/src/constants/Colors';
import CustomInput from '../../common/CustomInput';
import { Ionicons } from '@expo/vector-icons';

const schema = yup.object({
    email: yup.string().email('Invalid email').required('Email is required'),
});

type FormData = yup.InferType<typeof schema>;

const ForgotPasswordScreen = () => {
    const router = useRouter();
    const { email } = useLocalSearchParams<{ email?: string }>();
    const {
        control,
        handleSubmit,
        setValue,
        formState: { errors, isValid, isSubmitting },
    } = useForm<FormData>({
        defaultValues: { email: email || '' },
        resolver: yupResolver(schema),
        mode: 'onChange',
    });


    const onSubmit = async (data: FormData) => {
        try {
            // await sendResetLink(data.email).unwrap(); // Replace with your API call
            router.push(`/otp-verification?email=${data.email}`);
            // router.dismissAll();
        } catch (err) {
            console.error(err);
        }
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
                <Text variant="headlineMedium" style={styles.title}>Forgot Password</Text>
                <Text variant="bodyMedium" style={styles.subtitle}>Enter registered email address</Text>

                <CustomInput
                    name="email"
                    control={control}
                    label="Email Address"
                    placeholder="Email address here"
                    mode="outlined"
                    autoCapitalize="none"
                    keyboardType="email-address"
                    style={styles.input}
                    errorMessage={errors.email?.message}
                />

                <TouchableOpacity
                    onPress={handleSubmit(onSubmit)}
                    style={styles.button}
                >
                    <Text style={styles.buttonText}> Get OTP</Text>
                </TouchableOpacity>

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
        marginTop: 0,
    },
    backButton: {
        position: "absolute",
        top: 10,
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
    input: {
        marginBottom: 12,
    },
    button: {
        backgroundColor: AppTheme.lightColors?.primary,
        color: AppTheme.lightColors?.white,
        paddingVertical: 18,
        borderRadius: 12,
        alignItems: "center",
    },
    buttonText: {
        color: AppTheme.lightColors?.white,
        fontFamily: "PlusJakartaSans_600SemiBold",
        fontSize: 14,
    },
});

export default ForgotPasswordScreen;
