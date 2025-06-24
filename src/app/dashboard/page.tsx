"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/utils/supabase/client";
import { Tables } from "../../../database.types";
import { User } from "@supabase/supabase-js";

// Type for your users table row
export type DatabaseUser = Tables<"users">;

export default function DashboardPage() {
    const router = useRouter();
    const [user, setUser] = useState<User | null>(null);
    const [profile, setProfile] = useState<DatabaseUser | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const supabase = createClient();
        async function fetchUserAndProfile() {
            setIsLoading(true);
            const {
                data: { user },
            } = await supabase.auth.getUser();
            setUser(user);
            if (user) {
                const { data, error } = await supabase
                    .from("users")
                    .select("*")
                    .eq("user_id", user.id)
                    .single();
                setProfile(data || null);
                if (error) {
                    console.error("Error fetching user profile:", error);
                }
            } else {
                setProfile(null);
            }
            setIsLoading(false);
        }
        fetchUserAndProfile();
    }, []);

    const handleLogout = () => {
        router.push("/login");
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
            </div>
        );
    }

    if (!user || !profile) {
        router.push("/login");
        return null;
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100">
            {/* Navigation Header */}
            <nav className="bg-white shadow-lg">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-16">
                        <div className="flex items-center">
                            <h1 className="text-xl font-bold text-gray-900">
                                Dashboard
                            </h1>
                        </div>
                        <div className="flex items-center space-x-4">
                            <span className="text-gray-700">
                                Welcome, {profile.display_name}!
                            </span>
                            <button
                                onClick={handleLogout}
                                className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
                            >
                                Logout
                            </button>
                        </div>
                    </div>
                </div>
            </nav>

            {/* Main Content */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {/* User Profile Card */}
                    <div className="bg-white rounded-2xl shadow-xl p-6">
                        <div className="flex items-center space-x-4 mb-4">
                            <div className="w-12 h-12 bg-purple-600 rounded-full flex items-center justify-center">
                                <span className="text-white font-bold text-lg">
                                    {profile.username.charAt(0).toUpperCase()}
                                </span>
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900">
                                    {profile.username}
                                </h3>
                                <p className="text-gray-600">{profile.email}</p>
                            </div>
                        </div>
                        <div className="border-t pt-4">
                            <p className="text-sm text-gray-600">
                                Account Status:{" "}
                                <span className="text-green-600 font-medium">
                                    Active
                                </span>
                            </p>
                            <p className="text-sm text-gray-600">
                                Member Since:{" "}
                                <span className="font-medium">Today</span>
                            </p>
                        </div>
                    </div>

                    {/* Sample Content Cards */}
                    <div className="bg-white rounded-2xl shadow-xl p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">
                            Sample Content 1
                        </h3>
                        <p className="text-gray-600 mb-4">
                            This is a sample content card to demonstrate the
                            dashboard layout.
                        </p>
                        <button className="bg-indigo-600 text-white py-2 px-4 rounded-lg hover:bg-indigo-700 transition-colors">
                            View Details
                        </button>
                    </div>

                    <div className="bg-white rounded-2xl shadow-xl p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">
                            Sample Content 2
                        </h3>
                        <p className="text-gray-600 mb-4">
                            Another sample content card with different
                            information.
                        </p>
                        <button className="bg-indigo-600 text-white py-2 px-4 rounded-lg hover:bg-indigo-700 transition-colors">
                            View Details
                        </button>
                    </div>

                    <div className="bg-white rounded-2xl shadow-xl p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">
                            Sample Content 3
                        </h3>
                        <p className="text-gray-600 mb-4">
                            Third sample content card for demonstration
                            purposes.
                        </p>
                        <button className="bg-indigo-600 text-white py-2 px-4 rounded-lg hover:bg-indigo-700 transition-colors">
                            View Details
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
