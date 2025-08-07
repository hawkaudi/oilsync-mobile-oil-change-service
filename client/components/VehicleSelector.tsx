import React, { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Car, Loader2, CheckCircle, AlertCircle } from "lucide-react";

interface VehicleMake {
  id: string;
  name: string;
  country: string;
}

interface VehicleModel {
  id: string;
  name: string;
  year_start: number;
  year_end?: number;
  body_type: string;
  engine_type: string;
}

// Fallback data when database is not available
const fallbackMakes: VehicleMake[] = [
  { id: "audi", name: "Audi", country: "Germany" },
  { id: "volkswagen", name: "Volkswagen", country: "Germany" },
  { id: "porsche", name: "Porsche", country: "Germany" },
  { id: "bmw", name: "BMW", country: "Germany" },
  { id: "mercedes", name: "Mercedes-Benz", country: "Germany" },
  { id: "toyota", name: "Toyota", country: "Japan" },
  { id: "honda", name: "Honda", country: "Japan" },
  { id: "ford", name: "Ford", country: "USA" },
  { id: "chevrolet", name: "Chevrolet", country: "USA" },
  { id: "nissan", name: "Nissan", country: "Japan" },
];

const fallbackModels: { [key: string]: VehicleModel[] } = {
  audi: [
    {
      id: "a3",
      name: "A3",
      year_start: 2015,
      body_type: "Sedan",
      engine_type: "Gasoline",
    },
    {
      id: "a4",
      name: "A4",
      year_start: 2017,
      body_type: "Sedan",
      engine_type: "Gasoline",
    },
    {
      id: "a5",
      name: "A5",
      year_start: 2018,
      body_type: "Coupe",
      engine_type: "Gasoline",
    },
    {
      id: "q3",
      name: "Q3",
      year_start: 2019,
      body_type: "SUV",
      engine_type: "Gasoline",
    },
    {
      id: "q5",
      name: "Q5",
      year_start: 2018,
      body_type: "SUV",
      engine_type: "Gasoline",
    },
  ],
  volkswagen: [
    {
      id: "golf",
      name: "Golf",
      year_start: 2015,
      body_type: "Hatchback",
      engine_type: "Gasoline",
    },
    {
      id: "jetta",
      name: "Jetta",
      year_start: 2019,
      body_type: "Sedan",
      engine_type: "Gasoline",
    },
    {
      id: "tiguan",
      name: "Tiguan",
      year_start: 2018,
      body_type: "SUV",
      engine_type: "Gasoline",
    },
  ],
  porsche: [
    {
      id: "911",
      name: "911",
      year_start: 2016,
      body_type: "Coupe",
      engine_type: "Gasoline",
    },
    {
      id: "cayenne",
      name: "Cayenne",
      year_start: 2018,
      body_type: "SUV",
      engine_type: "Gasoline",
    },
    {
      id: "macan",
      name: "Macan",
      year_start: 2015,
      body_type: "SUV",
      engine_type: "Gasoline",
    },
  ],
};

interface VehicleData {
  vin: string;
  make: string;
  model: string;
  year: string;
}

interface VehicleSelectorProps {
  value: VehicleData;
  onChange: (vehicle: VehicleData) => void;
  entryMode: "vin" | "manual";
  onEntryModeChange: (mode: "vin" | "manual") => void;
}

export default function VehicleSelector({
  value,
  onChange,
  entryMode,
  onEntryModeChange,
}: VehicleSelectorProps) {
  const [makes, setMakes] = useState<VehicleMake[]>([]);
  const [models, setModels] = useState<VehicleModel[]>([]);
  const [years, setYears] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [vinDecoding, setVinDecoding] = useState(false);
  const [vinResult, setVinResult] = useState<{
    success: boolean;
    message: string;
    data?: any;
  } | null>(null);
  const [selectedMakeId, setSelectedMakeId] = useState("");
  const [selectedModelId, setSelectedModelId] = useState("");
  const [dbStatus, setDbStatus] = useState<
    "ready" | "seeding" | "error" | "empty"
  >("ready");

  // Load vehicle makes on component mount
  useEffect(() => {
    testAPIConnectivity();
  }, []);

  const testAPIConnectivity = async () => {
    try {
      console.log("Testing vehicle API connectivity...");
      console.log("Fetching: /api/vehicles/test");

      const response = await fetch("/api/vehicles/test");
      console.log("Response status:", response.status);
      console.log(
        "Response content-type:",
        response.headers.get("content-type"),
      );

      const responseText = await response.text();
      console.log(
        "API test response (first 300 chars):",
        responseText.substring(0, 300),
      );

      // Check if response is HTML (indicates routing problem)
      if (
        responseText.includes("<!doctype html>") ||
        responseText.includes("<html")
      ) {
        console.error(
          "Got HTML response instead of JSON - API routing issue detected",
        );
        console.log("Using fallback vehicle data...");
        useFallbackData();
        return;
      }

      try {
        const result = JSON.parse(responseText);
        if (result.success) {
          console.log("API connectivity test passed, loading makes...");
          loadVehicleMakes();
        } else {
          console.error("API connectivity test failed:", result);
          setDbStatus("error");
        }
      } catch (parseError) {
        console.error("Failed to parse API response as JSON:", parseError);
        console.log("Using fallback vehicle data...");
        useFallbackData();
      }
    } catch (error) {
      console.error("API connectivity test failed:", error);
      console.log("Using fallback vehicle data...");
      useFallbackData();
    }
  };

  const useFallbackData = () => {
    console.log("Loading fallback vehicle data");
    setMakes(fallbackMakes);
    setDbStatus("ready");
  };

  // Load models when make changes
  useEffect(() => {
    if (selectedMakeId) {
      loadVehicleModels(selectedMakeId);
    } else {
      setModels([]);
      setYears([]);
    }
  }, [selectedMakeId]);

  // Load years when model changes
  useEffect(() => {
    if (selectedModelId) {
      loadVehicleYears(selectedModelId);
    } else {
      setYears([]);
    }
  }, [selectedModelId]);

  const loadVehicleMakes = async () => {
    try {
      setLoading(true);
      console.log("Fetching vehicle makes from /api/vehicles/makes");

      const response = await fetch("/api/vehicles/makes");
      console.log("Response status:", response.status);
      console.log(
        "Response headers:",
        Object.fromEntries(response.headers.entries()),
      );

      // Get the raw response text first to see what we're actually getting
      const responseText = await response.text();
      console.log("Raw response:", responseText.substring(0, 200)); // First 200 chars

      // Try to parse as JSON
      let result;
      try {
        result = JSON.parse(responseText);
      } catch (parseError) {
        console.error("Failed to parse JSON response:", parseError);
        console.error("Response was:", responseText);

        // If it's HTML (likely an error page), check if it's a 404 or server error
        if (
          responseText.includes("<html") ||
          responseText.includes("<!DOCTYPE")
        ) {
          console.log("Received HTML response, likely endpoint not found");
          setDbStatus("error");
          // Try to seed anyway
          await seedVehicleDatabase();
          return;
        }

        throw new Error(`Invalid JSON response: ${parseError.message}`);
      }

      if (result.success) {
        setMakes(result.data || []);

        // If no makes found, automatically seed the database
        if ((result.data || []).length === 0 || result.needsSeeding) {
          console.log("No vehicle makes found, attempting to seed database...");
          setDbStatus("empty");
          await seedVehicleDatabase();
        } else {
          setDbStatus("ready");
        }
      } else {
        console.error("Failed to load vehicle makes:", result.message);
        console.error("Full error result:", result);

        // If database error, try to seed
        if (
          result.message.includes("Database error") ||
          result.message.includes("connection") ||
          result.message.includes("relation") ||
          result.error === "TABLES_NOT_FOUND" ||
          result.needsSeeding
        ) {
          console.log(
            "Database error detected, attempting to seed database...",
          );
          setDbStatus("error");
          await seedVehicleDatabase();
        } else {
          console.log("Using fallback data due to unknown error");
          useFallbackData();
        }
      }
    } catch (error) {
      console.error("Error loading vehicle makes:", error);
      setDbStatus("error");

      // Try seeding as a last resort
      console.log("Attempting to seed database due to error...");
      await seedVehicleDatabase();
    } finally {
      setLoading(false);
    }
  };

  const seedVehicleDatabase = async () => {
    try {
      setDbStatus("seeding");
      console.log("Seeding vehicle database...");

      const response = await fetch("/api/vehicles/seed", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const result = await response.json();

      if (result.success) {
        console.log("Database seeded successfully, reloading makes...");
        setDbStatus("ready");
        // Reload makes after seeding
        setTimeout(() => {
          loadVehicleMakes();
        }, 1000);
      } else {
        console.error("Failed to seed database:", result.message);
        setDbStatus("error");
      }
    } catch (error) {
      console.error("Error seeding database:", error);
      setDbStatus("error");
    }
  };

  const loadVehicleModels = async (makeId: string) => {
    try {
      setLoading(true);

      // Check if we have fallback data for this make
      const selectedMake = makes.find((m) => m.id === makeId);
      const fallbackKey = selectedMake?.name.toLowerCase();

      if (fallbackModels[fallbackKey]) {
        console.log(`Using fallback models for ${selectedMake?.name}`);
        setModels(fallbackModels[fallbackKey]);
        setLoading(false);
        return;
      }

      const response = await fetch(`/api/vehicles/models/${makeId}`);
      const result = await response.json();

      if (result.success) {
        setModels(result.data || []);
      } else {
        console.error("Failed to load vehicle models:", result.message);
        // Use fallback if available
        if (fallbackModels[fallbackKey]) {
          setModels(fallbackModels[fallbackKey]);
        }
      }
    } catch (error) {
      console.error("Error loading vehicle models:", error);
      // Use fallback if available
      const selectedMake = makes.find((m) => m.id === makeId);
      const fallbackKey = selectedMake?.name.toLowerCase();
      if (fallbackModels[fallbackKey]) {
        setModels(fallbackModels[fallbackKey]);
      }
    } finally {
      setLoading(false);
    }
  };

  const loadVehicleYears = async (modelId: string) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/vehicles/years/${modelId}`);
      const result = await response.json();

      if (result.success) {
        // Generate years from 2015 to current year + 1 if no specific years available
        const currentYear = new Date().getFullYear();
        const availableYears =
          result.data?.length > 0
            ? result.data
            : Array.from(
                { length: currentYear - 2014 },
                (_, i) => currentYear - i,
              );
        setYears(availableYears);
      } else {
        console.error("Failed to load vehicle years:", result.message);
        // Fallback to recent years
        const currentYear = new Date().getFullYear();
        setYears(Array.from({ length: 10 }, (_, i) => currentYear - i));
      }
    } catch (error) {
      console.error("Error loading vehicle years:", error);
      // Fallback to recent years
      const currentYear = new Date().getFullYear();
      setYears(Array.from({ length: 10 }, (_, i) => currentYear - i));
    } finally {
      setLoading(false);
    }
  };

  const handleVinDecode = async () => {
    if (!value.vin || value.vin.length !== 17) {
      setVinResult({
        success: false,
        message: "Please enter a valid 17-character VIN",
      });
      return;
    }

    try {
      setVinDecoding(true);
      setVinResult(null);

      const response = await fetch("/api/vehicles/test-vin", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ vin: value.vin }),
      });

      const result = await response.json();
      setVinResult(result);

      if (result.success && result.data?.decoded) {
        const decoded = result.data.decoded;
        onChange({
          ...value,
          make: decoded.make,
          model: decoded.model,
          year: decoded.year,
        });
      }
    } catch (error) {
      console.error("Error decoding VIN:", error);
      setVinResult({
        success: false,
        message: "Failed to decode VIN. Please try manual entry.",
      });
    } finally {
      setVinDecoding(false);
    }
  };

  const handleMakeChange = (makeId: string) => {
    setSelectedMakeId(makeId);
    const selectedMake = makes.find((m) => m.id === makeId);
    if (selectedMake) {
      onChange({
        ...value,
        make: selectedMake.name,
        model: "",
        year: "",
      });
    }
    setSelectedModelId("");
  };

  const handleModelChange = (modelId: string) => {
    setSelectedModelId(modelId);
    const selectedModel = models.find((m) => m.id === modelId);
    if (selectedModel) {
      onChange({
        ...value,
        model: selectedModel.name,
        year: "",
      });
    }
  };

  const handleYearChange = (year: string) => {
    onChange({
      ...value,
      year,
    });
  };

  return (
    <div className="space-y-4">
      {/* VIN or Manual Entry Toggle */}
      <div className="grid grid-cols-2 gap-2 p-1 bg-muted rounded-lg">
        <Button
          type="button"
          variant={entryMode === "vin" ? "default" : "ghost"}
          size="sm"
          onClick={() => onEntryModeChange("vin")}
          className="h-8"
        >
          VIN Entry
        </Button>
        <Button
          type="button"
          variant={entryMode === "manual" ? "default" : "ghost"}
          size="sm"
          onClick={() => onEntryModeChange("manual")}
          className="h-8"
        >
          Manual Entry
        </Button>
      </div>

      {entryMode === "vin" ? (
        <div className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="vin">Vehicle VIN</Label>
            <div className="flex space-x-2">
              <Input
                id="vin"
                placeholder="Enter 17-character VIN"
                value={value.vin}
                onChange={(e) =>
                  onChange({ ...value, vin: e.target.value.toUpperCase() })
                }
                maxLength={17}
                className="font-mono"
              />
              <Button
                type="button"
                onClick={handleVinDecode}
                disabled={vinDecoding || value.vin.length !== 17}
                className="flex-shrink-0"
              >
                {vinDecoding ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Car className="w-4 h-4" />
                )}
                Decode
              </Button>
            </div>
            <p className="text-sm text-gray-500">
              Supports Audi, Volkswagen, Porsche, BMW, Mercedes-Benz, and more
            </p>
          </div>

          {vinResult && (
            <Alert
              className={
                vinResult.success
                  ? "border-green-200 bg-green-50"
                  : "border-red-200 bg-red-50"
              }
            >
              {vinResult.success ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : (
                <AlertCircle className="h-4 w-4 text-red-600" />
              )}
              <AlertDescription
                className={
                  vinResult.success ? "text-green-800" : "text-red-800"
                }
              >
                {vinResult.message}
                {vinResult.success && vinResult.data?.decoded && (
                  <div className="mt-2 font-medium">
                    {vinResult.data.decoded.year} {vinResult.data.decoded.make}{" "}
                    {vinResult.data.decoded.model}
                  </div>
                )}
              </AlertDescription>
            </Alert>
          )}

          {/* Show decoded results */}
          {value.make && value.model && value.year && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-1">
                Decoded Vehicle:
              </h4>
              <p className="text-blue-800">
                {value.year} {value.make} {value.model}
              </p>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="make">Make</Label>
              <Select value={selectedMakeId} onValueChange={handleMakeChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select make" />
                </SelectTrigger>
                <SelectContent>
                  {makes.map((make) => (
                    <SelectItem key={make.id} value={make.id}>
                      {make.name}
                      <span className="text-sm text-gray-500 ml-2">
                        ({make.country})
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="model">Model</Label>
              <Select
                value={selectedModelId}
                onValueChange={handleModelChange}
                disabled={!selectedMakeId || loading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select model" />
                </SelectTrigger>
                <SelectContent>
                  {models.map((model) => (
                    <SelectItem key={model.id} value={model.id}>
                      {model.name}
                      <span className="text-sm text-gray-500 ml-2">
                        ({model.body_type})
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="year">Year</Label>
              <Select
                value={value.year}
                onValueChange={handleYearChange}
                disabled={!selectedModelId || loading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select year" />
                </SelectTrigger>
                <SelectContent>
                  {years.map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {loading && (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
              <span className="text-sm text-gray-600">Loading options...</span>
            </div>
          )}

          {dbStatus === "seeding" && (
            <Alert className="border-blue-200 bg-blue-50">
              <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />
              <AlertDescription className="text-blue-800">
                Setting up vehicle database... This may take a moment.
              </AlertDescription>
            </Alert>
          )}

          {dbStatus === "error" && (
            <Alert className="border-red-200 bg-red-50">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">
                Database setup failed. Please contact support if this continues.
                <Button
                  variant="link"
                  size="sm"
                  onClick={() => {
                    setDbStatus("ready");
                    testAPIConnectivity();
                  }}
                  className="text-red-700 hover:text-red-900 p-0 h-auto ml-2"
                >
                  Retry
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {dbStatus === "empty" && makes.length === 0 && !loading && (
            <Alert className="border-yellow-200 bg-yellow-50">
              <AlertCircle className="h-4 w-4 text-yellow-600" />
              <AlertDescription className="text-yellow-800">
                Vehicle database is being initialized automatically...
              </AlertDescription>
            </Alert>
          )}

          {value.make && value.model && value.year && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
              <h4 className="font-medium text-green-900 mb-1">
                Selected Vehicle:
              </h4>
              <p className="text-green-800">
                {value.year} {value.make} {value.model}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
