"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function LogoutPage() {
    const router = useRouter();

    useEffect(() => {
        // Clear user data from localStorage
        localStorage.removeItem("user");

        // Redirect to login page after a brief delay
        const timer = setTimeout(() => {
            router.push("/login");
        }, 2000);

        return () => clearTimeout(timer);
    }, [router]);

    return (
        <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-100 flex items-center justify-center p-4">
            <div className="max-w-md w-full text-center">
                <div className="bg-white rounded-2xl shadow-xl p-8">
                    <div className="mb-6">
                        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg
                                className="w-8 h-8 text-red-600"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                                />
                            </svg>
                        </div>
                        <h2 className="text-2xl font-bold text-gray-900 mb-2">
                            Logging Out
                        </h2>
                        <p className="text-gray-600">
                            You have been successfully logged out.
                        </p>
                    </div>

                    <div className="flex items-center justify-center space-x-2">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-red-600"></div>
                        <span className="text-gray-600">
                            Redirecting to login page...
                        </span>
                    </div>

                    <div className="mt-6">
                        <p className="text-sm text-gray-500">
                            If you are not redirected automatically,{" "}
                            <button
                                onClick={() => router.push("/login")}
                                className="text-red-600 hover:text-red-700 font-medium"
                            >
                                click here
                            </button>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
