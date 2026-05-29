"use server";

import { cookies } from "next/headers";
import { MewurkService, AttendanceResponse, CardDetailsResponse, LoginResponse, RefreshTokenResponse } from "@/services/mewurk";

const COOKIE_OPTIONS = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 1 week
};

export async function loginAction(email: string, password: string) {
    try {
        const lookupRes = await MewurkService.lookupUser(email);
        if (!lookupRes.isSuccess || !lookupRes.data.tenantDetails.length) {
            return { isSuccess: false, message: "User not found or no tenant associated." };
        }
        const tenantId = lookupRes.data.tenantDetails[0].tenantId;

        const loginRes = await MewurkService.loginUser(email, password, tenantId);
        if (!loginRes.isSuccess) {
            return { isSuccess: false, message: loginRes.message || "Login failed." };
        }

        const cookieStore = await cookies();
        cookieStore.set("mewurk_auth_token", loginRes.data.token, COOKIE_OPTIONS);
        if (loginRes.data.refreshToken) {
            cookieStore.set("mewurk_refresh_token", loginRes.data.refreshToken, COOKIE_OPTIONS);
        }
        cookieStore.set("mewurk_employee_code", String(loginRes.data.userModel.employeeCode), COOKIE_OPTIONS);
        cookieStore.set("mewurk_user_name", `${loginRes.data.userModel.firstName} ${loginRes.data.userModel.lastName}`, COOKIE_OPTIONS);

        return { 
            isSuccess: true, 
            data: {
                token: loginRes.data.token,
                employeeCode: String(loginRes.data.userModel.employeeCode),
                userName: `${loginRes.data.userModel.firstName} ${loginRes.data.userModel.lastName}`,
                refreshToken: loginRes.data.refreshToken
            }
        };
    } catch (error: any) {
        return { isSuccess: false, message: error.message || "An unexpected error occurred during login." };
    }
}

export async function logoutAction() {
    const cookieStore = await cookies();
    cookieStore.delete("mewurk_auth_token");
    cookieStore.delete("mewurk_refresh_token");
    cookieStore.delete("mewurk_employee_code");
    cookieStore.delete("mewurk_user_name");
    return { isSuccess: true };
}

export async function getAttendanceLogsAction(date: string) {
    const cookieStore = await cookies();
    const token = cookieStore.get("mewurk_auth_token")?.value;
    const employeeCode = cookieStore.get("mewurk_employee_code")?.value;

    if (!token || !employeeCode) {
        return { isSuccess: false, statusCode: 401, message: "Unauthorized" };
    }

    return await MewurkService.fetchAttendanceLogs(date, token, employeeCode);
}

export async function getCardDetailsAction(year: number, month: number) {
    const cookieStore = await cookies();
    const token = cookieStore.get("mewurk_auth_token")?.value;
    const employeeCode = cookieStore.get("mewurk_employee_code")?.value;

    if (!token || !employeeCode) {
        return { isSuccess: false, statusCode: 401, message: "Unauthorized" };
    }

    return await MewurkService.fetchCardDetails(token, employeeCode, year, month);
}

export async function refreshSessionAction() {
    const cookieStore = await cookies();
    const refreshToken = cookieStore.get("mewurk_refresh_token")?.value;

    if (!refreshToken) {
        return { isSuccess: false, message: "No refresh token available" };
    }

    try {
        const res = await MewurkService.refreshToken(refreshToken);
        if (res.isSuccess && res.data.token) {
            cookieStore.set("mewurk_auth_token", res.data.token, COOKIE_OPTIONS);
            if (res.data.refreshToken) {
                cookieStore.set("mewurk_refresh_token", res.data.refreshToken, COOKIE_OPTIONS);
            }
            return { isSuccess: true, token: res.data.token };
        }
        return { isSuccess: false, message: "Token refresh failed" };
    } catch (error) {
        return { isSuccess: false, message: "Network error during token refresh" };
    }
}

export async function getInitialAuthStateAction() {
    const cookieStore = await cookies();
    return {
        token: cookieStore.get("mewurk_auth_token")?.value || null,
        employeeCode: cookieStore.get("mewurk_employee_code")?.value || null,
        userName: cookieStore.get("mewurk_user_name")?.value || null,
    };
}

export async function searchEmployeesAction(searchText: string) {
    const cookieStore = await cookies();
    const token = cookieStore.get("mewurk_auth_token")?.value;
    if (!token) {
        return { isSuccess: false, statusCode: 401, message: "Unauthorized", data: null };
    }
    return await MewurkService.searchEmployees(token, searchText);
}

export async function getEmployeeAttendanceLogsAction(date: string, employeeCode: string) {
    const cookieStore = await cookies();
    const token = cookieStore.get("mewurk_auth_token")?.value;
    if (!token) {
        return { isSuccess: false, statusCode: 401, message: "Unauthorized" };
    }
    return await MewurkService.fetchAttendanceLogsForEmployee(date, token, employeeCode);
}

export async function getEmployeeCardDetailsAction(employeeCode: string, year: number, month: number) {
    const cookieStore = await cookies();
    const token = cookieStore.get("mewurk_auth_token")?.value;
    if (!token) {
        return { isSuccess: false, statusCode: 401, message: "Unauthorized" };
    }
    return await MewurkService.fetchCardDetailsForEmployee(token, employeeCode, year, month);
}

// Single action that fetches logs + card details in parallel — one server round-trip instead of two
export async function getEmployeeFullDataAction(date: string, employeeCode: string, year: number, month: number) {
    const cookieStore = await cookies();
    const token = cookieStore.get("mewurk_auth_token")?.value;
    if (!token) {
        return { isSuccess: false, statusCode: 401, message: "Unauthorized", logs: null, stats: null };
    }
    try {
        const [logsRes, statsRes] = await Promise.all([
            MewurkService.fetchAttendanceLogsForEmployee(date, token, employeeCode),
            MewurkService.fetchCardDetailsForEmployee(token, employeeCode, year, month),
        ]);
        return {
            isSuccess: Boolean(logsRes?.isSuccess || statsRes?.isSuccess),
            logs: logsRes?.isSuccess ? logsRes.data : null,
            stats: statsRes?.isSuccess ? statsRes.data?.cardDetails ?? null : null,
        };
    } catch {
        return { isSuccess: false, statusCode: 500, message: "Failed to fetch employee data", logs: null, stats: null };
    }
}

export async function getAllEmployeesAction() {
    const cookieStore = await cookies();
    const token = cookieStore.get("mewurk_auth_token")?.value;
    if (!token) {
        return { isSuccess: false, data: [] as import("@/services/mewurk").EmployeeSearchResult[] };
    }
    try {
        const response = await fetch("https://app.mewurk.com/api/v1/employeeservice/employee/getdirectory", {
            method: "POST",
            headers: {
                "accept": "application/json",
                "authorization": `Bearer ${token}`,
                "content-type": "application/json",
            },
            body: JSON.stringify({ searchText: "", pageNumber: 1, pageSize: 500 }),
        });
        if (!response.ok) return { isSuccess: false, data: [] };
        const json = await response.json();
        if (!json.isSuccess) return { isSuccess: false, data: [] };

        // Extract from employeesDataResponse key (confirmed working from browser logs)
        let list: any[] = [];
        if (json.data?.employeesDataResponse && Array.isArray(json.data.employeesDataResponse)) {
            list = json.data.employeesDataResponse;
        } else if (Array.isArray(json.data)) {
            list = json.data;
        } else if (json.data && typeof json.data === "object") {
            const key = Object.keys(json.data).find((k) => Array.isArray((json.data as any)[k]));
            if (key) list = (json.data as any)[key];
        }

        const employees = list.map((e: any) => ({
            employeeCode: e.employeeCode ?? e.EmployeeCode ?? e.empCode ?? 0,
            firstName: e.firstName ?? e.FirstName ?? e.first_name ?? e.foreName ?? "",
            lastName: e.lastName ?? e.LastName ?? e.last_name ?? e.surName ?? "",
            email: e.email ?? e.Email ?? e.emailId ?? "",
            designation: e.designation ?? e.Designation ?? e.designationName ?? "",
            department: e.department ?? e.Department ?? e.departmentName ?? "",
        }));

        return { isSuccess: true, data: employees };
    } catch {
        return { isSuccess: false, data: [] };
    }
}


