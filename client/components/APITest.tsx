import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function APITest() {
  const [results, setResults] = useState<{ [key: string]: any }>({});
  const [loading, setLoading] = useState(false);

  const testEndpoints = [
    { name: "Ping", url: "/api/ping" },
    { name: "Vehicle Test", url: "/api/vehicles/test" },
    { name: "Vehicle Makes", url: "/api/vehicles/makes" },
    { name: "Vehicle Seed", url: "/api/vehicles/seed", method: "POST" },
  ];

  const testEndpoint = async (name: string, url: string, method = "GET") => {
    try {
      console.log(`Testing ${name}: ${method} ${url}`);
      setResults((prev) => ({ ...prev, [name]: { status: "loading" } }));

      const options: RequestInit = { method };
      if (method === "POST") {
        options.headers = { "Content-Type": "application/json" };
      }

      const response = await fetch(url, options);
      const contentType = response.headers.get("content-type");
      const responseText = await response.text();

      let parsedResponse;
      let isJson = false;

      try {
        parsedResponse = JSON.parse(responseText);
        isJson = true;
      } catch {
        parsedResponse = responseText;
        isJson = false;
      }

      setResults((prev) => ({
        ...prev,
        [name]: {
          status: response.ok ? "success" : "error",
          statusCode: response.status,
          contentType,
          isJson,
          responseText: responseText.substring(0, 200),
          parsedResponse: isJson ? parsedResponse : null,
        },
      }));
    } catch (error) {
      setResults((prev) => ({
        ...prev,
        [name]: {
          status: "error",
          error: error instanceof Error ? error.message : "Unknown error",
        },
      }));
    }
  };

  const testAllEndpoints = async () => {
    setLoading(true);
    for (const endpoint of testEndpoints) {
      await testEndpoint(endpoint.name, endpoint.url, endpoint.method);
    }
    setLoading(false);
  };

  useEffect(() => {
    testAllEndpoints();
  }, []);

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>API Endpoint Testing</CardTitle>
        <CardDescription>Testing API connectivity and routing</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex space-x-2 mb-4">
          <Button onClick={testAllEndpoints} disabled={loading}>
            {loading ? "Testing..." : "Test All Endpoints"}
          </Button>
          <Button
            onClick={() =>
              testEndpoint("Manual Seed", "/api/vehicles/seed", "POST")
            }
            disabled={loading}
            variant="outline"
          >
            Seed Database
          </Button>
        </div>

        <div className="space-y-4">
          {testEndpoints.map(({ name, url, method = "GET" }) => (
            <div key={name} className="border rounded p-4">
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-semibold">{name}</h3>
                <div className="flex space-x-2">
                  <span className="text-xs bg-blue-100 px-2 py-1 rounded">
                    {method}
                  </span>
                  <code className="text-sm bg-gray-100 px-2 py-1 rounded">
                    {url}
                  </code>
                </div>
              </div>

              {results[name] ? (
                <div className="space-y-2 text-sm">
                  <div
                    className={`inline-block px-2 py-1 rounded text-white ${
                      results[name].status === "success"
                        ? "bg-green-500"
                        : results[name].status === "error"
                          ? "bg-red-500"
                          : "bg-yellow-500"
                    }`}
                  >
                    {results[name].status.toUpperCase()}
                  </div>

                  {results[name].statusCode && (
                    <div>Status Code: {results[name].statusCode}</div>
                  )}

                  {results[name].contentType && (
                    <div>Content-Type: {results[name].contentType}</div>
                  )}

                  {results[name].isJson !== undefined && (
                    <div>Is JSON: {results[name].isJson ? "Yes" : "No"}</div>
                  )}

                  {results[name].error && (
                    <div className="text-red-600">
                      Error: {results[name].error}
                    </div>
                  )}

                  {results[name].parsedResponse && (
                    <div>
                      <strong>JSON Response:</strong>
                      <pre className="bg-gray-100 p-2 rounded mt-1 overflow-auto">
                        {JSON.stringify(results[name].parsedResponse, null, 2)}
                      </pre>
                    </div>
                  )}

                  {results[name].responseText && !results[name].isJson && (
                    <div>
                      <strong>Raw Response (first 200 chars):</strong>
                      <pre className="bg-gray-100 p-2 rounded mt-1 overflow-auto text-xs">
                        {results[name].responseText}
                      </pre>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-gray-500">Not tested yet</div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
