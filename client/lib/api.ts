import { AuthResponse, LoginRequest, RegisterRequest } from "@shared/api";

// Enhanced API client with debugging for Netlify
class ApiClient {
  private baseURL: string;

  constructor() {
    this.baseURL = import.meta.env.VITE_API_URL || "";
    console.log("🔧 [API_CLIENT] Initialized with baseURL:", this.baseURL);
  }

  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {},
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;

    console.log(`🚀 [API_CLIENT] Making request:`, {
      url,
      method: options.method || "GET",
      headers: options.headers,
      body: options.body ? "present" : "none",
    });

    try {
      const response = await fetch(url, {
        headers: {
          "Content-Type": "application/json",
          ...options.headers,
        },
        ...options,
      });

      console.log(`📡 [API_CLIENT] Response received:`, {
        url,
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        contentType: response.headers.get("content-type"),
      });

      // Check if response is ok
      if (!response.ok) {
        console.error(`❌ [API_CLIENT] HTTP error:`, {
          status: response.status,
          statusText: response.statusText,
          url,
        });
      }

      // Get response text first to debug JSON parsing issues
      const responseText = await response.text();
      console.log(`📄 [API_CLIENT] Response text:`, {
        url,
        textLength: responseText.length,
        startsWithJson:
          responseText.startsWith("{") || responseText.startsWith("["),
        firstChars: responseText.substring(0, 100),
      });

      // Check if the response is actually JSON
      if (!responseText.trim()) {
        throw new Error(`Empty response from ${endpoint}`);
      }

      if (!responseText.startsWith("{") && !responseText.startsWith("[")) {
        console.error(`💥 [API_CLIENT] Non-JSON response:`, {
          url,
          responseText: responseText.substring(0, 500),
        });
        throw new Error(
          `API returned non-JSON response: ${responseText.substring(0, 100)}...`,
        );
      }

      // Try to parse JSON
      let data: T;
      try {
        data = JSON.parse(responseText);
        console.log(`✅ [API_CLIENT] JSON parsed successfully:`, {
          url,
          dataType: typeof data,
          hasSuccess: "success" in (data as any),
        });
      } catch (jsonError) {
        console.error(`💥 [API_CLIENT] JSON parse error:`, {
          url,
          error: jsonError.message,
          responseText: responseText.substring(0, 200),
        });
        throw new Error(
          `JSON.parse error: ${jsonError.message}. Response was: ${responseText.substring(0, 100)}...`,
        );
      }

      return data;
    } catch (error) {
      console.error(`💥 [API_CLIENT] Request failed:`, {
        url,
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }

  async login(credentials: LoginRequest): Promise<AuthResponse> {
    console.log("🔐 [API_CLIENT] Attempting login:", {
      email: credentials.email,
    });

    return this.makeRequest<AuthResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify(credentials),
    });
  }

  async register(userData: RegisterRequest): Promise<AuthResponse> {
    console.log("📝 [API_CLIENT] Attempting registration:", {
      email: userData.email,
    });

    return this.makeRequest<AuthResponse>("/auth/register", {
      method: "POST",
      body: JSON.stringify(userData),
    });
  }

  async get<T>(endpoint: string): Promise<T> {
    return this.makeRequest<T>(endpoint, { method: "GET" });
  }

  async post<T>(endpoint: string, data: any): Promise<T> {
    return this.makeRequest<T>(endpoint, {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async put<T>(endpoint: string, data: any): Promise<T> {
    return this.makeRequest<T>(endpoint, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  async delete<T>(endpoint: string): Promise<T> {
    return this.makeRequest<T>(endpoint, { method: "DELETE" });
  }
}

// Export singleton instance
export const apiClient = new ApiClient();

// Legacy functions for backward compatibility
export const loginUser = (credentials: LoginRequest) =>
  apiClient.login(credentials);
export const registerUser = (userData: RegisterRequest) =>
  apiClient.register(userData);
