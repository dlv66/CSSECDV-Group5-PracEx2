import Link from "next/link";

export default function HomePage() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
                <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
                    Welcome to Our App
                </h1>
                <p className="text-xl text-gray-600 mb-12 max-w-2xl mx-auto">
                    A web application to demonstrate authentication by
                    registering, logging in, and accessing a protected
                    dashboard.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-3 gap-6 max-w-4xl mx-auto">
                    {/* Registration Card */}
                    <div className="bg-white rounded-2xl shadow-xl p-6 hover:shadow-2xl transition-shadow flex flex-col">
                        <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg
                                className="w-6 h-6 text-blue-600"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
                                />
                            </svg>
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                            Registration
                        </h3>
                        <p className="text-gray-600 mb-4 flex-grow">
                            Create a new account with username, email, and
                            password
                        </p>
                        <Link
                            href="/register"
                            className="inline-block bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                        >
                            Get Started
                        </Link>
                    </div>

                    {/* Login Card */}
                    <div className="bg-white rounded-2xl shadow-xl p-6 hover:shadow-2xl transition-shadow flex flex-col">
                        <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg
                                className="w-6 h-6 text-green-600"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"
                                />
                            </svg>
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                            Login
                        </h3>
                        <p className="text-gray-600 mb-4 flex-grow">
                            Sign in with your username/email and password
                        </p>
                        <Link
                            href="/login"
                            className="inline-block bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-colors"
                        >
                            Sign In
                        </Link>
                    </div>

                    {/* Dashboard Card */}
                    <div className="bg-white rounded-2xl shadow-xl p-6 hover:shadow-2xl transition-shadow flex flex-col">
                        <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg
                                className="w-6 h-6 text-purple-600"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                                />
                            </svg>
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                            Dashboard
                        </h3>
                        <p className="text-gray-600 mb-4 flex-grow">
                            Access your protected dashboard content
                        </p>
                        <Link
                            href="/dashboard"
                            className="inline-block bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700 transition-colors"
                        >
                            View Dashboard
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
