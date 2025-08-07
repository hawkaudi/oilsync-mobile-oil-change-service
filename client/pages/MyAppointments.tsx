import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Calendar,
  Clock,
  MapPin,
  Car,
  Phone,
  Mail,
  ArrowLeft,
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertCircle,
} from "lucide-react";

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: string;
  emailVerified?: boolean;
  phoneVerified?: boolean;
}

interface Booking {
  id: string;
  customerId: string;
  vehicleId: string;
  serviceAddress: string;
  status: "pending" | "confirmed" | "in_progress" | "completed" | "cancelled";
  scheduledDate: string;
  completedDate?: string;
  notes?: string;
  estimatedDuration: number;
  price: number;
  createdAt: string;
  updatedAt: string;
  vehicle?: {
    id: string;
    make: string;
    model: string;
    year: string;
    vin?: string;
  };
}

const statusConfig = {
  pending: {
    color: "bg-yellow-100 text-yellow-800",
    icon: AlertCircle,
    label: "Pending",
  },
  confirmed: {
    color: "bg-blue-100 text-blue-800",
    icon: CheckCircle,
    label: "Confirmed",
  },
  in_progress: {
    color: "bg-orange-100 text-orange-800",
    icon: RefreshCw,
    label: "In Progress",
  },
  completed: {
    color: "bg-green-100 text-green-800",
    icon: CheckCircle,
    label: "Completed",
  },
  cancelled: {
    color: "bg-red-100 text-red-800",
    icon: XCircle,
    label: "Cancelled",
  },
};

export default function MyAppointments() {
  const [user, setUser] = useState<User | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Check if user is logged in
    const token = localStorage.getItem("authToken");
    const userData = localStorage.getItem("user");

    if (!token || !userData) {
      navigate("/login");
      return;
    }

    try {
      const parsedUser = JSON.parse(userData) as User;
      setUser(parsedUser);
      fetchUserBookings(parsedUser.id);
    } catch (error) {
      console.error("Failed to parse user data:", error);
      navigate("/login");
    }
  }, [navigate]);

  const fetchUserBookings = async (customerId: string) => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/bookings?customerId=${customerId}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("authToken")}`,
        },
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Failed to fetch appointments");
      }

      setBookings(result.data || []);
    } catch (error) {
      console.error("Error fetching bookings:", error);
      setError(
        error instanceof Error ? error.message : "Failed to load appointments",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleCancelBooking = async (bookingId: string) => {
    if (!confirm("Are you sure you want to cancel this appointment?")) {
      return;
    }

    try {
      const response = await fetch(`/api/bookings/${bookingId}/cancel`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("authToken")}`,
          "Content-Type": "application/json",
        },
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Failed to cancel appointment");
      }

      // Refresh bookings
      if (user) {
        fetchUserBookings(user.id);
      }
    } catch (error) {
      console.error("Error cancelling booking:", error);
      setError(
        error instanceof Error ? error.message : "Failed to cancel appointment",
      );
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Loading your appointments...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/")}
                className="flex items-center space-x-2"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back to Home</span>
              </Button>
              <h1 className="text-xl font-semibold text-gray-900">
                My Appointments
              </h1>
            </div>
            {user && (
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600">
                  {user.firstName} {user.lastName}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <Alert className="mb-6 border-red-200 bg-red-50">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              {error}
            </AlertDescription>
          </Alert>
        )}

        {bookings.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <Calendar className="w-16 h-16 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                No appointments yet
              </h3>
              <p className="text-gray-600 mb-6">
                You haven't booked any oil change services yet.
              </p>
              <Link to="/">
                <Button>Book Your First Service</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">
                Your Appointments ({bookings.length})
              </h2>
              <Button
                variant="outline"
                size="sm"
                onClick={() => user && fetchUserBookings(user.id)}
                className="flex items-center space-x-2"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Refresh</span>
              </Button>
            </div>

            <div className="grid gap-6">
              {bookings.map((booking) => {
                const StatusIcon = statusConfig[booking.status].icon;
                const canCancel =
                  booking.status === "pending" ||
                  booking.status === "confirmed";

                return (
                  <Card
                    key={booking.id}
                    className="hover:shadow-md transition-shadow"
                  >
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <CardTitle className="text-lg">
                            Oil Change Service
                          </CardTitle>
                          <CardDescription className="flex items-center space-x-2">
                            <Badge
                              className={statusConfig[booking.status].color}
                            >
                              <StatusIcon className="w-3 h-3 mr-1" />
                              {statusConfig[booking.status].label}
                            </Badge>
                            <span>•</span>
                            <span>#{booking.id.slice(0, 8)}</span>
                          </CardDescription>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-green-600">
                            ${booking.price}
                          </div>
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="space-y-4">
                      {/* Date & Time */}
                      <div className="flex items-center space-x-2 text-gray-600">
                        <Calendar className="w-4 h-4" />
                        <span>{formatDate(booking.scheduledDate)}</span>
                        <Clock className="w-4 h-4 ml-4" />
                        <span>{formatTime(booking.scheduledDate)}</span>
                        <span>({booking.estimatedDuration} min)</span>
                      </div>

                      {/* Vehicle Info */}
                      {booking.vehicle && (
                        <div className="flex items-center space-x-2 text-gray-600">
                          <Car className="w-4 h-4" />
                          <span>
                            {booking.vehicle.year} {booking.vehicle.make}{" "}
                            {booking.vehicle.model}
                          </span>
                          {booking.vehicle.vin && (
                            <span className="text-sm text-gray-500">
                              (VIN: {booking.vehicle.vin.slice(0, 8)}...)
                            </span>
                          )}
                        </div>
                      )}

                      {/* Service Address */}
                      <div className="flex items-start space-x-2 text-gray-600">
                        <MapPin className="w-4 h-4 mt-0.5" />
                        <span>{booking.serviceAddress}</span>
                      </div>

                      {/* Notes */}
                      {booking.notes && (
                        <div className="bg-gray-50 p-3 rounded-lg">
                          <p className="text-sm text-gray-700">
                            {booking.notes}
                          </p>
                        </div>
                      )}

                      {/* Completion Date */}
                      {booking.completedDate && (
                        <div className="text-sm text-green-600">
                          Completed on {formatDate(booking.completedDate)}
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex items-center justify-between pt-4 border-t">
                        <div className="text-sm text-gray-500">
                          Booked on {formatDate(booking.createdAt)}
                        </div>
                        <div className="space-x-2">
                          {canCancel && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleCancelBooking(booking.id)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              Cancel
                            </Button>
                          )}
                          <Link to="/">
                            <Button variant="outline" size="sm">
                              Book Again
                            </Button>
                          </Link>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
