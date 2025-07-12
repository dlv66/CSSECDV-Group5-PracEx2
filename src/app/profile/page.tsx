"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface UserProfile {
    id: number;
    username: string;
    email: string;
    displayName: string;
    createdAt: string;
    lastLogin: string;
}

export default function ProfilePage() {
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [formData, setFormData] = useState({
        displayName: "",
        email: "",
        username: "",
    });
    const [errors, setErrors] = useState<{ [key: string]: string }>({});
    const [isLoading, setIsLoading] = useState(true);
    const [isUpdating, setIsUpdating] = useState(false);
    const [isLoggingOut, setIsLoggingOut] = useState(false);
    const [updateSuccess, setUpdateSuccess] = useState(false);
    const router = useRouter();

    // Load user profile on component mount
    useEffect(() => {
        loadProfile();
    }, []);

    const loadProfile = async () => {
        try {
            const res = await fetch("/api/profile", {
                method: "GET",
                headers: { "Content-Type": "application/json" },
            });

            if (!res.ok) {
                if (res.status === 401) {
                    router.push("/login");
                    return;
                }
                throw new Error("Failed to load profile");
            }

            const data = await res.json();
            setProfile(data);
            setFormData({
                displayName: data.displayName || "",
                email: data.email || "",
                username: data.username || "",
            });
        } catch {
            router.push("/login");
        } finally {
            setIsLoading(false);
        }
    };

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
        // Clear success message when user starts editing
        if (updateSuccess) {
            setUpdateSuccess(false);
        }
    };

    const validateForm = () => {
        const newErrors: { [key: string]: string } = {};

        if (!formData.displayName.trim()) {
            newErrors.displayName = "Display name is required";
        }

        if (!formData.username.trim()) {
            newErrors.username = "Username is required";
        } else if (formData.username.length < 3) {
            newErrors.username = "Username must be at least 3 characters long";
        } else if (formData.username.length > 30) {
            newErrors.username = "Username must be less than 30 characters";
        } else if (!/^[A-Za-z0-9_-]+$/.test(formData.username)) {
            newErrors.username =
                "Username can only contain letters, numbers, underscores, and hyphens";
        }

        if (!formData.email.trim()) {
            newErrors.email = "Email is required";
        } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
            newErrors.email = "Please enter a valid email address";
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleUpdateProfile = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validateForm()) return;

        setIsUpdating(true);

        try {
            const res = await fetch("/api/profile", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    displayName: formData.displayName.trim(),
                    email: formData.email.trim(),
                    username: formData.username.trim(),
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                if (data.error?.includes("Email")) {
                    setErrors({ email: data.error });
                } else if (data.error?.includes("Username")) {
                    setErrors({ username: data.error });
                } else {
                    setErrors({
                        api: data.error || "Failed to update profile",
                    });
                }
                setIsUpdating(false);
                return;
            }

            // Update local profile state
            setProfile(data.user);
            setUpdateSuccess(true);

            // Clear success message after 3 seconds
            setTimeout(() => setUpdateSuccess(false), 3000);
        } catch {
            setErrors({ api: "Something went wrong. Please try again." });
        } finally {
            setIsUpdating(false);
        }
    };

    const handleLogout = async () => {
        setIsLoggingOut(true);
        try {
            await fetch("/api/logout", { method: "POST" });
            router.push("/login");
        } catch {
            setIsLoggingOut(false);
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Loading profile...</p>
                </div>
            </div>
        );
    }

    if (!profile) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-100 flex items-center justify-center">
                <div className="text-center">
                    <p className="text-red-600">Failed to load profile</p>
                    <Link
                        href="/login"
                        className="text-blue-600 hover:underline mt-2 block"
                    >
                        Return to login
                    </Link>
                </div>
            </div>
        );
    }

    // Ensure form data is always defined
    const safeFormData = {
        displayName: formData.displayName || "",
        email: formData.email || "",
        username: formData.username || "",
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
            <div className="max-w-4xl mx-auto px-4 py-8">
                {/* Header */}
                <div className="text-center mb-8">
                    <h1 className="text-4xl font-bold text-gray-900 mb-2">
                        Profile
                    </h1>
                    <p className="text-gray-600">
                        Manage your account information
                    </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Profile Information Card */}
                    <div className="bg-white rounded-2xl shadow-xl p-6">
                        <h2 className="text-2xl font-semibold text-gray-900 mb-6">
                            Profile Information
                        </h2>

                        <div className="space-y-4">
                            <div className="flex items-center space-x-4">
                                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                                    <span className="text-white font-bold text-xl">
                                        {profile.displayName
                                            .charAt(0)
                                            .toUpperCase()}
                                    </span>
                                </div>
                                <div>
                                    <h3 className="text-lg font-semibold text-gray-900">
                                        {profile.displayName}
                                    </h3>
                                    <p className="text-gray-600">
                                        @{profile.username}
                                    </p>
                                </div>
                            </div>

                            <div className="border-t pt-4 space-y-3">
                                <div>
                                    <label className="text-sm font-medium text-gray-500">
                                        Email
                                    </label>
                                    <p className="text-gray-900">
                                        {profile.email}
                                    </p>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-gray-500">
                                        Username
                                    </label>
                                    <p className="text-gray-900">
                                        {profile.username}
                                    </p>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-gray-500">
                                        Member Since
                                    </label>
                                    <p className="text-gray-900">
                                        {new Date(
                                            profile.createdAt,
                                        ).toLocaleDateString()}
                                    </p>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-gray-500">
                                        Last Login
                                    </label>
                                    <p className="text-gray-900">
                                        {profile.lastLogin
                                            ? new Date(
                                                  profile.lastLogin,
                                              ).toLocaleString()
                                            : "Never"}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Update Profile Form */}
                    <div className="bg-white rounded-2xl shadow-xl p-6">
                        <h2 className="text-2xl font-semibold text-gray-900 mb-6">
                            Update Profile
                        </h2>

                        <form
                            onSubmit={handleUpdateProfile}
                            className="space-y-6"
                        >
                            <div>
                                <label
                                    htmlFor="username"
                                    className="block text-sm font-medium text-black mb-2"
                                >
                                    Username
                                </label>
                                <input
                                    id="username"
                                    name="username"
                                    type="text"
                                    value={safeFormData.username}
                                    onChange={handleChange}
                                    className={`w-full text-black px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                                        errors.username
                                            ? "border-red-300"
                                            : "border-gray-300"
                                    }`}
                                    placeholder="Enter your username"
                                />
                                {errors.username && (
                                    <p className="mt-1 text-sm text-red-600">
                                        {errors.username}
                                    </p>
                                )}
                            </div>

                            <div>
                                <label
                                    htmlFor="displayName"
                                    className="block text-sm font-medium text-gray-700 mb-2"
                                >
                                    Display Name
                                </label>
                                <input
                                    id="displayName"
                                    name="displayName"
                                    type="text"
                                    value={safeFormData.displayName}
                                    onChange={handleChange}
                                    className={`w-full text-black px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                                        errors.displayName
                                            ? "border-red-300"
                                            : "border-gray-300"
                                    }`}
                                    placeholder="Enter your display name"
                                />
                                {errors.displayName && (
                                    <p className="mt-1 text-sm text-red-600">
                                        {errors.displayName}
                                    </p>
                                )}
                            </div>

                            <div>
                                <label
                                    htmlFor="email"
                                    className="block text-sm font-medium text-gray-700 mb-2"
                                >
                                    Email Address
                                </label>
                                <input
                                    id="email"
                                    name="email"
                                    type="email"
                                    value={safeFormData.email}
                                    onChange={handleChange}
                                    className={`w-full text-black px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                                        errors.email
                                            ? "border-red-300"
                                            : "border-gray-300"
                                    }`}
                                    placeholder="Enter your email address"
                                />
                                {errors.email && (
                                    <p className="mt-1 text-sm text-red-600">
                                        {errors.email}
                                    </p>
                                )}
                            </div>

                            {errors.api && (
                                <p className="text-sm text-red-600 text-center">
                                    {errors.api}
                                </p>
                            )}

                            {updateSuccess && (
                                <p className="text-sm text-green-600 text-center">
                                    Profile updated successfully!
                                </p>
                            )}

                            <button
                                type="submit"
                                disabled={isUpdating}
                                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 px-4 rounded-lg font-medium hover:from-blue-700 hover:to-purple-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isUpdating ? "Updating..." : "Update Profile"}
                            </button>
                        </form>

                        {/* Logout Button */}
                        <div className="mt-8 pt-6 border-t">
                            <button
                                onClick={handleLogout}
                                disabled={isLoggingOut}
                                className="w-full bg-red-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-red-700 focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isLoggingOut ? "Logging out..." : "Logout"}
                            </button>
                        </div>

                        {/* Navigation Links */}
                        <div className="mt-6 pt-6 border-t">
                            <div className="flex justify-center space-x-4">
                                <Link
                                    href="/dashboard"
                                    className="text-blue-600 hover:text-blue-700 font-medium transition-colors"
                                >
                                    Dashboard
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
