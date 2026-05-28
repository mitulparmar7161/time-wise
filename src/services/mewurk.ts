export interface EmployeeSearchResult {
  employeeCode: number;
  firstName: string;
  lastName: string;
  email: string;
  designation?: string;
  department?: string;
  mobileNumber?: string;
}

export interface EmployeeSearchResponse {
  isSuccess: boolean;
  statusCode: number;
  message: string;
  data: EmployeeSearchResult[] | null;
  paginationResponse?: any;
}

export interface ClockInDetail {
  inOutType: "IN" | "OUT";
  clockTime: string;
  deviceName: string;
  latitude: string;
  longitude: string;
  officeName: string;
  sourceName: string;
}

export interface AttendanceData {
  attendanceDate: string;
  policyName: string;
  shiftName: string;
  shiftStartTime: string;
  shiftEndTime: string;
  clockInDetails: ClockInDetail[];
  originalClockInDetails: any[];
  regularizationType: string | null;
  regularizationReason: string | null;
}

export interface AttendanceResponse {
  isSuccess: boolean;
  statusCode: number;
  message: string;
  data: AttendanceData;
  paginationResponse: any;
}

export interface LookupResponse {
    isSuccess: boolean;
    statusCode: number;
    message: string;
    data: {
        userName: string;
        tenantDetails: {
            tenantId: number;
            tenantName: string;
        }[];
    };
}

export interface LoginResponse {
    isSuccess: boolean;
    statusCode: number;
    message: string;
    data: {
        token: string;
        refreshToken: string;
        userModel: {
            employeeCode: number | string;
            firstName: string;
            lastName: string;
            email: string;
            roleName: string;
        }
    }
}

export interface RefreshTokenResponse {
  isSuccess: boolean;
  statusCode: number;
  message: string;
  data: {
    token: string;
    refreshToken: string;
  };
}

export interface CardDetailsResponse {
    isSuccess: boolean;
    statusCode: number;
    message: string;
    data: {
        employeeCode: number;
        cardDetails: {
            present: { type: string; totalPresent: number };
            offDays: { type: string; totalHoliday: number; totalWeekoff: number; totalLeave: number };
            absent: { type: string; totalAbsent: number; irRegularity: number };
            regularization: { type: string; applied: number; approved: number; pending: number };
            gracePeriod: { type: string; lateIn: number; earlyOut: number };
            penalty: any;
            overTime: any;
            workingHours: { type: string; total: number; dayAvg: number };
        };
    };
    paginationResponse: any;
}

export const MewurkService = {
  searchEmployees: async (token: string, searchText: string): Promise<EmployeeSearchResponse> => {
    const headers = {
      "accept": "application/json",
      "authorization": `Bearer ${token}`,
      "content-type": "application/json",
    };

    const extractAndFilter = (json: any, search: string): EmployeeSearchResult[] => {
      let list: any[] = [];
      if (Array.isArray(json.data)) {
        list = json.data;
      } else if (json.paginationResponse && Array.isArray(json.paginationResponse.data)) {
        list = json.paginationResponse.data;
      } else if (json.data && Array.isArray(json.data.employees)) {
        list = json.data.employees;
      } else if (json.data && Array.isArray(json.data.items)) {
        list = json.data.items;
      }
      // Normalise field names — directory API may use different casing
      list = list.map((e: any) => ({
        employeeCode: e.employeeCode ?? e.EmployeeCode ?? e.empCode ?? 0,
        firstName: e.firstName ?? e.FirstName ?? e.first_name ?? "",
        lastName: e.lastName ?? e.LastName ?? e.last_name ?? "",
        email: e.email ?? e.Email ?? e.emailId ?? "",
        designation: e.designation ?? e.Designation ?? e.designationName ?? "",
        department: e.department ?? e.Department ?? e.departmentName ?? "",
      }));
      // Always filter client-side so results match typed text
      if (search.trim()) {
        const lower = search.toLowerCase();
        list = list.filter(
          (e) =>
            e.firstName?.toLowerCase().includes(lower) ||
            e.lastName?.toLowerCase().includes(lower) ||
            `${e.firstName} ${e.lastName}`.toLowerCase().includes(lower) ||
            String(e.employeeCode).includes(lower) ||
            e.email?.toLowerCase().includes(lower)
        );
      }
      return list;
    };

    // 1️⃣ Try getemployeeprofilelist first (richest data)
    try {
      const res1 = await fetch(
        "https://app.mewurk.com/api/v1/employeeservice/employee/getemployeeprofilelist",
        {
          method: "POST",
          headers,
          body: JSON.stringify({ searchText, pageNumber: 1, pageSize: 50, isActive: true }),
        }
      );
      if (res1.ok) {
        const json = await res1.json();
        if (json.isSuccess) {
          const employees = extractAndFilter(json, searchText);
          return { isSuccess: true, statusCode: 200, message: "OK", data: employees };
        }
      }
    } catch {}

    // 2️⃣ Fallback: getdirectory (GET with query param)
    try {
      const res2 = await fetch(
        `https://app.mewurk.com/api/v1/employeeservice/employee/getdirectory?searchText=${encodeURIComponent(searchText)}&pageNumber=1&pageSize=50`,
        { method: "GET", headers }
      );
      if (res2.ok) {
        const json = await res2.json();
        if (json.isSuccess) {
          const employees = extractAndFilter(json, searchText);
          return { isSuccess: true, statusCode: 200, message: "OK", data: employees };
        }
      }
    } catch {}

    return { isSuccess: false, statusCode: 500, message: "Employee search unavailable", data: null };
  },

  fetchAttendanceLogsForEmployee: async (date: string, token: string, employeeCode: string): Promise<AttendanceResponse> => {
    try {
      const response = await fetch("https://app.mewurk.com/api/v1/attendanceservice/attendancelogs/clockindetails", {
        method: "POST",
        headers: {
          "accept": "application/json",
          "authorization": `Bearer ${token}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({ employeeCode: Number(employeeCode), clockDate: date }),
      });
      if (!response.ok) {
        return { isSuccess: false, statusCode: response.status, message: `API Error: ${response.status}`, data: null as any, paginationResponse: null };
      }
      const json = await response.json();
      return json ?? { isSuccess: false, statusCode: 500, message: "Empty API response", data: null as any, paginationResponse: null };
    } catch {
      return { isSuccess: false, statusCode: 500, message: "Network error while fetching attendance logs", data: null as any, paginationResponse: null };
    }
  },

  fetchCardDetailsForEmployee: async (token: string, employeeCode: string, year: number, month: number): Promise<CardDetailsResponse> => {
    try {
      const response = await fetch("https://app.mewurk.com/api/v1/attendanceservice/attendance/carddetails", {
        method: "POST",
        headers: {
          "accept": "application/json",
          "authorization": `Bearer ${token}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({ employeeCode: Number(employeeCode), year, month }),
      });
      if (!response.ok) {
        return { isSuccess: false, statusCode: response.status, message: `API Error: ${response.status}`, data: null as any, paginationResponse: null };
      }
      const json = await response.json();
      return json ?? { isSuccess: false, statusCode: 500, message: "Empty API response", data: null as any, paginationResponse: null };
    } catch {
      return { isSuccess: false, statusCode: 500, message: "Network error while fetching card details", data: null as any, paginationResponse: null };
    }
  },

  fetchCardDetails: async (token: string, employeeCode: string, year: number, month: number): Promise<CardDetailsResponse> => {
      const response = await fetch("https://app.mewurk.com/api/v1/attendanceservice/attendance/carddetails", {
          method: "POST",
          headers: {
              "accept": "application/json",
              "authorization": `Bearer ${token}`,
              "content-type": "application/json"
          },
          body: JSON.stringify({ employeeCode: Number(employeeCode), year: year, month: month })
      });
      if (!response.ok) {
          return { isSuccess: false, statusCode: response.status, message: `API Error: ${response.status}`, data: null as any, paginationResponse: null };
      }
      return response.json();
  },

  fetchAttendanceLogs: async (date: string, token: string, employeeCode: string): Promise<AttendanceResponse> => {
    const response = await fetch("https://app.mewurk.com/api/v1/attendanceservice/attendancelogs/clockindetails", {
      method: "POST",
      headers: {
        "accept": "application/json",
        "accept-language": "en-GB,en-US;q=0.9,en;q=0.8",
        "authorization": `Bearer ${token}`,
        "content-type": "application/json",
        "priority": "u=1, i"
      },
      body: JSON.stringify({ employeeCode: Number(employeeCode), clockDate: date })
    });
    if (!response.ok) {
      return { isSuccess: false, statusCode: response.status, message: `API Error: ${response.status}`, data: null as any, paginationResponse: null };
    }
    return response.json();
  },

  lookupUser: async (email: string): Promise<LookupResponse> => {
      const response = await fetch(`https://app.mewurk.com/api/v1/userservice/account/lookup?userName=${encodeURIComponent(email)}`, {
          method: 'GET',
          headers: { 'accept': 'application/json', 'accept-language': 'en-GB,en-US;q=0.9,en;q=0.8', 'content-type': 'application/json' }
      });
      if (!response.ok) throw new Error(`Lookup Failed: ${response.status}`);
      return response.json();
  },

  loginUser: async (email: string, password: string, tenantId: number): Promise<LoginResponse> => {
      const encodedUserName = btoa(`${email}|${tenantId}`);
      const response = await fetch('https://app.mewurk.com/api/v1/userservice/account/login', {
          method: 'POST',
          headers: { 'accept': 'application/json', 'content-type': 'application/json' },
          body: JSON.stringify({ userName: encodedUserName, password: password, otp: null })
      });
      if (!response.ok) throw new Error(`Login Failed: ${response.status}`);
      return response.json();
  },

  refreshToken: async (refreshToken: string): Promise<RefreshTokenResponse> => {
    try {
      const response = await fetch("https://app.mewurk.com/api/v1/userservice/account/refreshtoken", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
      });
      return await response.json();
    } catch (error) {
      return { isSuccess: false, statusCode: 500, message: "Network error during token refresh", data: {} as any };
    }
  }
};
