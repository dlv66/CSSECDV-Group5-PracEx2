import "@testing-library/jest-dom";
import "whatwg-fetch"; // This polyfills fetch, Request, Response, and Headers globally

// Mock NextResponse for API route tests
jest.mock("next/server", () => ({
    NextResponse: {
        json: jest.fn((data, options) => ({
            json: jest.fn().mockResolvedValue(data),
            status: options?.status || 200,
            cookies: {
                set: jest.fn(),
            },
            headers: {
                get: jest.fn((name) => {
                    if (name === "set-cookie") {
                        return "id=mock-jwt-token; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=604800";
                    }
                    return null;
                }),
                set: jest.fn(),
                has: jest.fn(),
            },
        })),
    },
    NextRequest: jest.fn().mockImplementation((url, options) => ({
        json: jest
            .fn()
            .mockResolvedValue(options?.body ? JSON.parse(options.body) : {}),
        url: url,
        method: options?.method || "GET",
        cookies: {
            get: jest.fn(),
            getAll: jest.fn(),
            set: jest.fn(),
        },
        headers: {
            get: jest.fn(),
            set: jest.fn(),
            has: jest.fn(),
        },
    })),
}));

// Mock next/headers for Supabase client
jest.mock("next/headers", () => ({
    cookies: jest.fn(() => ({
        getAll: jest.fn(() => []),
        set: jest.fn(),
        get: jest.fn(),
    })),
}));
