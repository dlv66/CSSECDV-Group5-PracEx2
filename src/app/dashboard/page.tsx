import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import { redirect } from "next/navigation";

const JWT_SECRET = process.env.JWT_SECRET || "dev_secret";

interface JwtPayload {
    id: string;
    username: string;
    email: string;
    displayName?: string;
    iat?: number;
    exp?: number;
}

/**
 * Escapes HTML entities to prevent XSS attacks
 * @param text - The text to escape
 * @returns string - The escaped text
 */
function escapeHtml(text: string): string {
    const htmlEscapes: { [key: string]: string } = {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#x27;",
        "/": "&#x2F;",
    };

    return text.replace(/[&<>"'/]/g, (match) => htmlEscapes[match]);
}

export default async function DashboardPage() {
    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token")?.value;
    let user: JwtPayload | null = null;
    if (token) {
        try {
            const payload = jwt.verify(token, JWT_SECRET);
            if (
                typeof payload === "object" &&
                "username" in payload &&
                "email" in payload &&
                "id" in payload
            ) {
                user = payload as JwtPayload;
            }
        } catch {
            // Invalid token
        }
    }
    if (!user) {
        redirect("/login");
    }

    // Escape username and email for safe display
    const safeUsername = escapeHtml(user.username);
    const safeEmail = escapeHtml(user.email);
    const safeDisplayName = user.displayName
        ? escapeHtml(user.displayName)
        : safeUsername;

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
                                Welcome, {safeDisplayName}!
                            </span>
                            <a
                                href="/logout"
                                className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
                            >
                                Logout
                            </a>
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
                                    {safeDisplayName.charAt(0).toUpperCase()}
                                </span>
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900">
                                    {safeDisplayName}
                                </h3>
                                <p className="text-gray-600">{safeEmail}</p>
                                {user.displayName && (
                                    <p className="text-sm text-gray-500">
                                        @{safeUsername}
                                    </p>
                                )}
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
