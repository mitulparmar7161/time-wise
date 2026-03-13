
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
            // ... other fields not strictly needed
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
            roleName: string; // Added roleName
            // ... other fields
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
  fetchCardDetails: async (token: string, employeeCode: string, year: number, month: number): Promise<CardDetailsResponse> => {
      const response = await fetch("https://app.mewurk.com/api/v1/attendanceservice/attendance/carddetails", {
          method: "POST",
          headers: {
              "accept": "application/json",
              "authorization": `Bearer ${token}`,
              "content-type": "application/json"
          },
          body: JSON.stringify({
              employeeCode: Number(employeeCode),
              year: year,
              month: month
          })
      });

      if (!response.ok) {
          return {
              isSuccess: false,
              statusCode: response.status,
              message: `API Error: ${response.status}`,
              data: null as any,
              paginationResponse: null
          };
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
      body: JSON.stringify({
        employeeCode: Number(employeeCode),
        clockDate: date 
      })
    });

    if (!response.ok) {
      return {
        isSuccess: false,
        statusCode: response.status,
        message: `API Error: ${response.status}`,
        data: null as any,
        paginationResponse: null
      };
    }

    return response.json();
  },

  lookupUser: async (email: string): Promise<LookupResponse> => {
      const response = await fetch(`https://app.mewurk.com/api/v1/userservice/account/lookup?userName=${encodeURIComponent(email)}`, {
          method: 'GET',
          headers: {
              'accept': 'application/json',
              'accept-language': 'en-GB,en-US;q=0.9,en;q=0.8',
              'content-type': 'application/json'
          }
      });
      if (!response.ok) throw new Error(`Lookup Failed: ${response.status}`);
      return response.json();
  },

  loginUser: async (email: string, password: string, tenantId: number): Promise<LoginResponse> => {
      // payload format from curl: base64(email + "|" + tenantId)
      const rawUserName = `${email}|${tenantId}`;
      const encodedUserName = btoa(rawUserName);

      const response = await fetch('https://app.mewurk.com/api/v1/userservice/account/login', {
          method: 'POST',
          headers: {
              'accept': 'application/json',
              'content-type': 'application/json'
          },
          body: JSON.stringify({
              userName: encodedUserName,
              password: password,
              otp: null
          })
      });
      if (!response.ok) throw new Error(`Login Failed: ${response.status}`);
      return response.json();
  },

  refreshToken: async (refreshToken: string): Promise<RefreshTokenResponse> => {
    try {
      const response = await fetch(
        "https://app.mewurk.com/api/v1/userservice/account/refreshtoken",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ refreshToken }),
        }
      );

      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Refresh token error:", error);
      return {
        isSuccess: false,
        statusCode: 500,
        message: "Network error during token refresh",
        data: {} as any,
      };
    }
  }
};
