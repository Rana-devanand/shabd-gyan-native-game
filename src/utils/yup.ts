import * as yup from "yup";
export const createAccount = yup.object({
     name: yup
       .string()
       .required("Full Name is required")
       .min(2, "Name is too short"),
     username: yup
       .string()
       .required("Username is required")
       .min(3, "Username must be at least 3 characters"),
     email: yup.string().email("Invalid email").required("Email is required"),
     password: yup
       .string()
       .required("Password is required")
       .min(8, "Password must be at least 8 characters")
       .matches(/[a-z]/, "Password must contain a lowercase letter")
       .matches(/[A-Z]/, "Password must contain an uppercase letter"),
     confirmPassword: yup
       .string()
       .oneOf([yup.ref("password")], "Passwords must match")
       .required("Confirm Password is required"),
   });