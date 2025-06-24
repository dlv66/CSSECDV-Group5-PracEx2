import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/utils/supabase/client";

interface RegistrationFormData {
    displayName: string;
    username: string;
    email: string;
    password: string;
    confirmPassword: string;
}

interface RegistrationErrors {
    [key: string]: string;
}

interface UseRegistrationReturn {
    formData: RegistrationFormData;
    errors: RegistrationErrors;
    isLoading: boolean;
    handleChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    handleSubmit: (e: React.FormEvent) => Promise<void>;
    resetForm: () => void;
}

export const useRegistration = (): UseRegistrationReturn => {
    const [formData, setFormData] = useState<RegistrationFormData>({
        displayName: "",
        username: "",
        email: "",
        password: "",
        confirmPassword: "",
    });
    const [errors, setErrors] = useState<RegistrationErrors>({});
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();
    const supabase = createClient();

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: value,
        }));
        // Clear error when user starts typing
        if (errors[name]) {
            setErrors((prev) => ({
                ...prev,
                [name]: "",
            }));
        }
    };

    const validateForm = (): boolean => {
        const newErrors: RegistrationErrors = {};

        if (!formData.displayName.trim()) {
            newErrors.displayName = "Display name is required";
        }

        if (!formData.username.trim()) {
            newErrors.username = "Username is required";
        } else if (formData.username.length < 3) {
            newErrors.username = "Username must be at least 3 characters";
        }

        if (!formData.email.trim()) {
            newErrors.email = "Email is required";
        } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
            newErrors.email = "Please enter a valid email";
        }

        if (!formData.password) {
            newErrors.password = "Password is required";
        } else if (formData.password.length < 6) {
            newErrors.password = "Password must be at least 6 characters";
        }

        if (formData.password !== formData.confirmPassword) {
            newErrors.confirmPassword = "Passwords do not match";
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validateForm()) return;

        setIsLoading(true);

        try {
            const res = await fetch("/api/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    displayName: formData.displayName,
                    username: formData.username,
                    email: formData.email,
                    password: formData.password,
                }),
            });
            const data = await res.json();

            if (!res.ok) {
                console.error("Registration failed:", data);
                setErrors({ general: data.error || "Registration failed" });
                setIsLoading(false);
                return;
            }

            // Auto-sign in after successful registration
            const { error: signInError } =
                await supabase.auth.signInWithPassword({
                    email: formData.email,
                    password: formData.password,
                });

            if (signInError) {
                console.error("Auto sign-in error:", signInError);
                // Don't fail registration if auto sign-in fails
                // User can manually sign in later
            }

            // Registration successful
            router.push("/dashboard");
        } catch (error) {
            console.error("Registration error:", error);
            setErrors({ general: "Registration failed. Please try again." });
        } finally {
            setIsLoading(false);
        }
    };

    const resetForm = () => {
        setFormData({
            displayName: "",
            username: "",
            email: "",
            password: "",
            confirmPassword: "",
        });
        setErrors({});
        setIsLoading(false);
    };

    return {
        formData,
        errors,
        isLoading,
        handleChange,
        handleSubmit,
        resetForm,
    };
};
