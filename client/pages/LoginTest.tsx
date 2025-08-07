import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiClient } from "@/lib/api";

export default function LoginTest() {
  const [response, setResponse] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const testLogin = async () => {
    setLoading(true);
    setResponse(null);

    try {
      console.log("🧪 [LOGIN_TEST] Starting login test...");

      const result = await apiClient.login({
        email: "test@test.com",
        password: "test123",
      });

      console.log("🧪 [LOGIN_TEST] Login result:", result);
      setResponse(result);
    } catch (error) {
      console.error("🧪 [LOGIN_TEST] Login error:", error);
      setResponse({
        error: true,
        message: error.message,
        timestamp: new Date().toISOString(),
      });
    } finally {
      setLoading(false);
    }
  };

  const testDatabaseConnection = async () => {
    setLoading(true);
    setResponse(null);

    try {
      console.log("🧪 [DB_TEST] Testing database connection...");

      const result = await apiClient.get("/vehicles/test");

      console.log("🧪 [DB_TEST] Database test result:", result);
      setResponse(result);
    } catch (error) {
      console.error("🧪 [DB_TEST] Database test error:", error);
      setResponse({
        error: true,
        message: error.message,
        timestamp: new Date().toISOString(),
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle>🧪 Login & Database Test</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Button onClick={testDatabaseConnection} disabled={loading}>
              Test Database
            </Button>
            <Button onClick={testLogin} disabled={loading}>
              Test Login (test@test.com)
            </Button>
          </div>

          {loading && (
            <div className="text-center text-gray-600">Testing...</div>
          )}

          {response && (
            <div className="mt-4">
              <h3 className="font-semibold mb-2">Response:</h3>
              <pre className="bg-gray-100 p-4 rounded overflow-x-auto text-sm">
                {JSON.stringify(response, null, 2)}
              </pre>
            </div>
          )}

          <div className="text-sm text-gray-600">
            <p>
              <strong>Test User:</strong> test@test.com / test123
            </p>
            <p>
              <strong>Database:</strong> In-memory SQLite with test data
            </p>
            <p>
              <strong>Debug:</strong> Check browser console for detailed logs
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
