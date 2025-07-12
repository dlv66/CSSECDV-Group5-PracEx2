"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface User {
    id: number;
    username: string;
    email: string;
    displayName: string;
    createdAt: string;
    lastLogin: string;
    roles: { id: number; name: string }[];
}

interface Role {
    id: number;
    name: string;
    description?: string;
}

interface UserWithChanges extends User {
    selectedRoles: number[];
    hasChanges: boolean;
}

interface CurrentUser {
    id: string;
    username: string;
    email: string;
    displayName?: string;
}

export default function AdminPage() {
    const [users, setUsers] = useState<UserWithChanges[]>([]);
    const [roles, setRoles] = useState<Role[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
    // Modal state
    const [showModal, setShowModal] = useState(false);
    const [selectedUser, setSelectedUser] = useState<UserWithChanges | null>(
        null,
    );

    // Fetch users and roles from the database
    useEffect(() => {
        const fetchData = async () => {
            try {
                setIsLoading(true);
                setError(null);

                // Fetch current user profile
                const profileResponse = await fetch("/api/profile");
                if (profileResponse.ok) {
                    const profileData = await profileResponse.json();
                    setCurrentUser({
                        id: profileData.id.toString(),
                        username: profileData.username,
                        email: profileData.email,
                        displayName: profileData.displayName,
                    });
                }

                // Fetch all users
                const usersResponse = await fetch("/api/admin/users");
                if (!usersResponse.ok) {
                    const errorData = await usersResponse
                        .json()
                        .catch(() => ({}));
                    throw new Error(
                        errorData.error ||
                            `Failed to fetch users (${usersResponse.status})`,
                    );
                }
                const usersData = await usersResponse.json();

                // Fetch all available roles
                const rolesResponse = await fetch("/api/admin/roles");
                if (!rolesResponse.ok) {
                    const errorData = await rolesResponse
                        .json()
                        .catch(() => ({}));
                    throw new Error(
                        errorData.error ||
                            `Failed to fetch roles (${rolesResponse.status})`,
                    );
                }
                const rolesData = await rolesResponse.json();

                // Initialize users with selected roles and change tracking
                const usersWithChanges: UserWithChanges[] = usersData.users.map(
                    (user: User) => ({
                        ...user,
                        selectedRoles: user.roles.map((role) => role.id),
                        hasChanges: false,
                    }),
                );

                setUsers(usersWithChanges);
                setRoles(rolesData.roles || []);
            } catch (err) {
                console.error("Error fetching data:", err);
                setError(
                    err instanceof Error ? err.message : "Failed to load data",
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
                        roles: [],
                    },
                    {
                        id: 2,
                        username: "jane_smith",
                        email: "jane@example.com",
                        displayName: "Jane Smith",
                        createdAt: "2024-01-10T09:15:00Z",
                        lastLogin: "2024-01-21T16:20:00Z",
                        roles: [],
                    },
                ];

                const mockRoles: Role[] = [
                    { id: 1, name: "user", description: "Regular user" },
                    { id: 2, name: "admin", description: "Administrator" },
                    {
                        id: 3,
                        name: "moderator",
                        description: "Content moderator",
                    },
                ];

                const usersWithChanges: UserWithChanges[] = mockUsers.map(
                    (user) => ({
                        ...user,
                        selectedRoles: [],
                        hasChanges: false,
                    }),
                );

                setUsers(usersWithChanges);
                setRoles(mockRoles);
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, []);

    // Handle role changes (updates local state only)
    const handleRoleChange = (
        userId: number,
        roleId: number,
        checked: boolean,
    ) => {
        setUsers((prevUsers) =>
            prevUsers.map((user) => {
                if (user.id === userId) {
                    const newSelectedRoles = checked
                        ? [...user.selectedRoles, roleId]
                        : user.selectedRoles.filter((id) => id !== roleId);

                    const hasChanges =
                        JSON.stringify(newSelectedRoles.sort()) !==
                        JSON.stringify(user.roles.map((r) => r.id).sort());

                    return {
                        ...user,
                        selectedRoles: newSelectedRoles,
                        hasChanges,
                    };
                }
                return user;
            }),
        );
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

    // Restore handleSave to open modal
    const handleSave = (user: UserWithChanges) => {
        setSelectedUser(user);
        setShowModal(true);
    };
    // Restore cancelSave to close modal and revert changes
    const cancelSave = () => {
        setShowModal(false);
        setSelectedUser(null);
    };
    // ConfirmSave
    const confirmSave = async () => {
        if (!selectedUser) return;
        setError(null);

        try {
            await fetch("/api/admin/users", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    userId: selectedUser.id,
                    displayName: selectedUser.displayName,
                    email: selectedUser.email,
                    username: selectedUser.username,
                    roleIds: selectedUser.selectedRoles, // array of role IDs
                }),
            });

            // Optionally, refresh users list or update local state
            setShowModal(false);
            setSelectedUser(null);
            // Optionally, refetch users here
        } catch (err) {
            setError("Failed to update user roles.");
        }

    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Loading admin panel...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
            {/* Header */}
            <div className="bg-white shadow-sm border-b">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center py-6">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900">
                                Admin Panel
                            </h1>
                            <p className="mt-1 text-sm text-gray-500">
                                Manage user roles and permissions
                            </p>
                        </div>
                        <Link
                            href="/dashboard"
                            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                        >
                            Back to Dashboard
                        </Link>
                    </div>
                </div>
            </div>

            {/* Error Message */}
            {error && (
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                        <div className="flex">
                            <div className="flex-shrink-0">
                                <svg
                                    className="h-5 w-5 text-red-400"
                                    viewBox="0 0 20 20"
                                    fill="currentColor"
                                >
                                    <path
                                        fillRule="evenodd"
                                        d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                                        clipRule="evenodd"
                                    />
                                </svg>
                            </div>
                            <div className="ml-3">
                                <p className="text-sm text-red-800">{error}</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Main Content */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-200">
                        <h2 className="text-xl font-semibold text-gray-900">
                            User Management
                        </h2>
                        <p className="text-sm text-gray-500 mt-1">
                            Update user roles and permissions
                        </p>
                    </div>

                    {/* User List */}
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        User
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Current Roles
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Role Selection
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {users.length === 0 ? (
                                    <tr>
                                        <td
                                            colSpan={4}
                                            className="px-6 py-12 text-center"
                                        >
                                            <div className="text-gray-500">
                                                <svg
                                                    className="mx-auto h-12 w-12 text-gray-400"
                                                    fill="none"
                                                    viewBox="0 0 24 24"
                                                    stroke="currentColor"
                                                >
                                                    <path
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                        strokeWidth={2}
                                                        d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"
                                                    />
                                                </svg>
                                                <h3 className="mt-2 text-sm font-medium text-gray-900">
                                                    No users found
                                                </h3>
                                                <p className="mt-1 text-sm text-gray-500">
                                                    Get started by creating some
                                                    users.
                                                </p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    users.map((user) => (
                                        <tr
                                            key={user.id}
                                            className={
                                                user.hasChanges
                                                    ? "bg-yellow-50"
                                                    : ""
                                            }
                                        >
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center">
                                                    <div className="flex-shrink-0 h-10 w-10">
                                                        <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                                                            <span className="text-gray-600 font-medium text-sm">
                                                                {user.displayName
                                                                    .charAt(0)
                                                                    .toUpperCase()}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <div className="ml-4">
                                                        <div className="text-sm font-medium text-gray-900">
                                                            {user.displayName}
                                                            {currentUser &&
                                                                user.id.toString() ===
                                                                    currentUser.id && (
                                                                    <span className="ml-2 inline-flex items-center text-xs font-medium">
                                                                        (YOU)
                                                                    </span>
                                                                )}
                                                        </div>
                                                        <div className="text-sm text-gray-500">
                                                            {user.email}
                                                        </div>
                                                        <div className="text-xs text-gray-400">
                                                            Joined:{" "}
                                                            {formatDate(
                                                                user.createdAt,
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex flex-wrap gap-1">
                                                    {user.roles.length === 0 ? (
                                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                                            No roles assigned
                                                        </span>
                                                    ) : (
                                                        user.roles.map(
                                                            (role) => (
                                                                <span
                                                                    key={
                                                                        role.id
                                                                    }
                                                                    className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                                                                >
                                                                    {role.name}
                                                                </span>
                                                            ),
                                                        )
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="space-y-2">
                                                    {roles.length === 0 ? (
                                                        <p className="text-sm text-gray-500 italic">
                                                            No roles available
                                                        </p>
                                                    ) : (
                                                        roles.map((role) => (
                                                            <label
                                                                key={role.id}
                                                                className="flex items-center"
                                                            >
                                                                <input
                                                                    type="checkbox"
                                                                    checked={user.selectedRoles.includes(
                                                                        role.id,
                                                                    )}
                                                                    onChange={(
                                                                        e,
                                                                    ) =>
                                                                        handleRoleChange(
                                                                            user.id,
                                                                            role.id,
                                                                            e
                                                                                .target
                                                                                .checked,
                                                                        )
                                                                    }
                                                                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                                                />
                                                                <span className="ml-2 text-sm text-gray-700">
                                                                    {role.name}
                                                                    {role.description && (
                                                                        <span className="text-gray-500 ml-1">
                                                                            (
                                                                            {
                                                                                role.description
                                                                            }
                                                                            )
                                                                        </span>
                                                                    )}
                                                                </span>
                                                            </label>
                                                        ))
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                                <button
                                                    onClick={() =>
                                                        handleSave(user)
                                                    }
                                                    className="px-4 py-2 rounded-lg font-medium transition-colors bg-green-600 text-white hover:bg-green-700"
                                                >
                                                    Save Changes
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
            {/* Confirmation Modal */}
            {showModal && selectedUser && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
                    <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
                        <div className="mt-3">
                            <div className="flex items-center justify-center w-12 h-12 mx-auto bg-yellow-100 rounded-full">
                                <svg
                                    className="w-6 h-6 text-yellow-600"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth="2"
                                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                                    ></path>
                                </svg>
                            </div>
                            <div className="mt-4 text-center">
                                <h3 className="text-lg font-medium text-gray-900">
                                    Confirm Role Changes
                                </h3>
                                <div className="mt-2 px-7 py-3">
                                    <p className="text-sm text-gray-500">
                                        Are you sure you want to update the
                                        roles for{" "}
                                        <strong>
                                            {selectedUser.displayName}
                                        </strong>
                                        ?
                                    </p>
                                    <div className="mt-4 text-left">
                                        <p className="text-sm font-medium text-gray-700 mb-2">
                                            Changes:
                                        </p>
                                        <div className="bg-gray-50 p-3 rounded-lg">
                                            <div className="text-sm">
                                                <span className="text-gray-600">
                                                    From:{" "}
                                                </span>
                                                <span className="text-black font-medium">
                                                    {selectedUser.roles.length >
                                                    0
                                                        ? selectedUser.roles
                                                              .map(
                                                                  (role) =>
                                                                      role.name,
                                                              )
                                                              .join(", ")
                                                        : "No roles assigned"}
                                                </span>
                                            </div>
                                            <div className="text-sm mt-1">
                                                <span className="text-gray-600">
                                                    To:{" "}
                                                </span>
                                                <span className="text-black font-medium">
                                                    {selectedUser.selectedRoles
                                                        .length > 0
                                                        ? roles
                                                              .filter((role) =>
                                                                  selectedUser.selectedRoles.includes(
                                                                      role.id,
                                                                  ),
                                                              )
                                                              .map(
                                                                  (role) =>
                                                                      role.name,
                                                              )
                                                              .join(", ")
                                                        : "No roles assigned"}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex justify-center space-x-3 mt-6">
                                    <button
                                        onClick={cancelSave}
                                        className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
                                    >
                                        Discard
                                    </button>
                                    <button
                                        onClick={confirmSave}
                                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                                    >
                                        Save Changes
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
