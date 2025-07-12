"use client";

import { useState, useEffect } from "react";

interface User {
    id: number;
    username: string;
    email: string;
    displayName: string;
    createdAt: string;
    lastLogin: string;
    roles: { id: number; name: string }[];
}

interface EditUserForm {
    displayName: string;
    email: string;
    username: string;
}

export default function UsersPage() {
    const [users, setUsers] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showModal, setShowModal] = useState(false);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [formData, setFormData] = useState<EditUserForm>({
        displayName: "",
        email: "",
        username: "",
    });
    const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({});
    const [isUpdating, setIsUpdating] = useState(false);
    const [updateSuccess, setUpdateSuccess] = useState(false);

    // Fetch users on component mount
    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            setIsLoading(true);
            setError(null);

            const response = await fetch("/api/admin/users");
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(
                    errorData.error ||
                        `Failed to fetch users (${response.status})`,
                );
            }

            const data = await response.json();
            setUsers(data.users || []);
        } catch (err) {
            console.error("Error fetching users:", err);
            setError(
                err instanceof Error ? err.message : "Failed to load users",
            );

            // Fallback to mock data if API fails
            const mockUsers: User[] = [
                {
                    id: 1,
                    username: "john_doe",
                    email: "john@example.com",
                    displayName: "John Doe",
                    createdAt: "2024-01-15T10:30:00Z",
                    lastLogin: "2024-01-20T14:45:00Z",
                    roles: [{ id: 1, name: "user" }],
                },
                {
                    id: 2,
                    username: "jane_smith",
                    email: "jane@example.com",
                    displayName: "Jane Smith",
                    createdAt: "2024-01-10T09:15:00Z",
                    lastLogin: "2024-01-21T16:20:00Z",
                    roles: [{ id: 2, name: "admin" }],
                },
                {
                    id: 3,
                    username: "bob_wilson",
                    email: "bob@example.com",
                    displayName: "Bob Wilson",
                    createdAt: "2024-01-05T11:20:00Z",
                    lastLogin: "2024-01-19T13:30:00Z",
                    roles: [{ id: 1, name: "user" }],
                },
            ];
            setUsers(mockUsers);
        } finally {
            setIsLoading(false);
        }
    };

    const handleEditUser = (user: User) => {
        setSelectedUser(user);
        setFormData({
            displayName: user.displayName || "",
            email: user.email || "",
            username: user.username || "",
        });
        setFormErrors({});
        setUpdateSuccess(false);
        setShowModal(true);
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setSelectedUser(null);
        setFormData({ displayName: "", email: "", username: "" });
        setFormErrors({});
        setUpdateSuccess(false);
    };

    const handleFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: value,
        }));

        // Clear error when user starts typing
        if (formErrors[name]) {
            setFormErrors((prev) => ({
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

        setFormErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleUpdateUser = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validateForm() || !selectedUser) return;

        setIsUpdating(true);

        try {
            const response = await fetch("/api/admin/users", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    userId: selectedUser.id,
                    displayName: formData.displayName.trim(),
                    email: formData.email.trim(),
                    username: formData.username.trim(),
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                if (data.error?.includes("Email")) {
                    setFormErrors({ email: data.error });
                } else if (data.error?.includes("Username")) {
                    setFormErrors({ username: data.error });
                } else {
                    setFormErrors({
                        api: data.error || "Failed to update user",
                    });
                }
                setIsUpdating(false);
                return;
            }

            // Update the user in the local state
            setUsers((prevUsers) =>
                prevUsers.map((user) =>
                    user.id === selectedUser.id
                        ? {
                              ...user,
                              displayName: data.user.displayName,
                              email: data.user.email,
                              username: data.user.username,
                          }
                        : user,
                ),
            );

            setUpdateSuccess(true);

            // Close modal after 2 seconds
            setTimeout(() => {
                handleCloseModal();
            }, 2000);
        } catch {
            setFormErrors({ api: "Something went wrong. Please try again." });
        } finally {
            setIsUpdating(false);
        }
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Loading users...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 py-8">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="bg-white rounded-lg shadow">
                    <div className="px-6 py-4 border-b border-gray-200">
                        <h1 className="text-2xl font-semibold text-gray-900">
                            Users
                        </h1>
                        <p className="mt-1 text-sm text-gray-600">
                            Manage user accounts and information
                        </p>
                    </div>

                    {error && (
                        <div className="px-6 py-4 bg-red-50 border-b border-red-200">
                            <p className="text-sm text-red-600">{error}</p>
                        </div>
                    )}

                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        User
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Email
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Roles
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Created
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Last Login
                                    </th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {users.map((user) => (
                                    <tr
                                        key={user.id}
                                        className="hover:bg-gray-50"
                                    >
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div>
                                                <div className="text-sm font-medium text-gray-900">
                                                    {user.displayName}
                                                </div>
                                                <div className="text-sm text-gray-500">
                                                    @{user.username}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            {user.email}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex flex-wrap gap-1">
                                                {user.roles.map((role) => (
                                                    <span
                                                        key={role.id}
                                                        className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                                                    >
                                                        {role.name}
                                                    </span>
                                                ))}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {formatDate(user.createdAt)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {user.lastLogin
                                                ? formatDate(user.lastLogin)
                                                : "Never"}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <button
                                                onClick={() =>
                                                    handleEditUser(user)
                                                }
                                                className="text-blue-600 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 px-3 py-1 rounded-md text-sm font-medium transition-colors"
                                            >
                                                Edit
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {users.length === 0 && !error && (
                        <div className="px-6 py-12 text-center">
                            <p className="text-gray-500">No users found.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Edit User Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
                    <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
                        <div className="mt-3">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-medium text-gray-900">
                                    Edit User
                                </h3>
                                <button
                                    onClick={handleCloseModal}
                                    className="text-gray-400 hover:text-gray-600"
                                >
                                    <svg
                                        className="h-6 w-6"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        stroke="currentColor"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M6 18L18 6M6 6l12 12"
                                        />
                                    </svg>
                                </button>
                            </div>

                            <form
                                onSubmit={handleUpdateUser}
                                className="space-y-4"
                            >
                                <div>
                                    <label
                                        htmlFor="displayName"
                                        className="block text-sm font-medium text-gray-700 mb-1"
                                    >
                                        Display Name
                                    </label>
                                    <input
                                        type="text"
                                        id="displayName"
                                        name="displayName"
                                        value={formData.displayName}
                                        onChange={handleFormChange}
                                        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black ${
                                            formErrors.displayName
                                                ? "border-red-300"
                                                : "border-gray-300"
                                        }`}
                                        placeholder="Enter display name"
                                    />
                                    {formErrors.displayName && (
                                        <p className="mt-1 text-sm text-red-600">
                                            {formErrors.displayName}
                                        </p>
                                    )}
                                </div>

                                <div>
                                    <label
                                        htmlFor="username"
                                        className="block text-sm font-medium text-gray-700 mb-1"
                                    >
                                        Username
                                    </label>
                                    <input
                                        type="text"
                                        id="username"
                                        name="username"
                                        value={formData.username}
                                        onChange={handleFormChange}
                                        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black ${
                                            formErrors.username
                                                ? "border-red-300"
                                                : "border-gray-300"
                                        }`}
                                        placeholder="Enter username"
                                    />
                                    {formErrors.username && (
                                        <p className="mt-1 text-sm text-red-600">
                                            {formErrors.username}
                                        </p>
                                    )}
                                </div>

                                <div>
                                    <label
                                        htmlFor="email"
                                        className="block text-sm font-medium text-gray-700 mb-1"
                                    >
                                        Email
                                    </label>
                                    <input
                                        type="email"
                                        id="email"
                                        name="email"
                                        value={formData.email}
                                        onChange={handleFormChange}
                                        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black ${
                                            formErrors.email
                                                ? "border-red-300"
                                                : "border-gray-300"
                                        }`}
                                        placeholder="Enter email address"
                                    />
                                    {formErrors.email && (
                                        <p className="mt-1 text-sm text-red-600">
                                            {formErrors.email}
                                        </p>
                                    )}
                                </div>

                                {formErrors.api && (
                                    <p className="text-sm text-red-600 text-center">
                                        {formErrors.api}
                                    </p>
                                )}

                                {updateSuccess && (
                                    <p className="text-sm text-green-600 text-center">
                                        User updated successfully!
                                    </p>
                                )}

                                <div className="flex justify-end space-x-3 pt-4">
                                    <button
                                        type="button"
                                        onClick={handleCloseModal}
                                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isUpdating}
                                        className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 rounded-md transition-colors"
                                    >
                                        {isUpdating
                                            ? "Updating..."
                                            : "Update User"}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
