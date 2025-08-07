import { useState, useEffect } from "react";
import { BookingRequest, ApiResponse } from "@shared/api";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Calendar,
  Clock,
  Shield,
  Users,
  MapPin,
  Star,
  User,
  LogOut,
  Mail,
  Phone,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import OTPVerificationModal from "@/components/OTPVerificationModal";
import PhoneOTPVerificationModal from "@/components/PhoneOTPVerificationModal";
import AddressAutocomplete from "@/components/AddressAutocomplete";
import VehicleSelector from "@/components/VehicleSelector";

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: string;
  emailVerified?: boolean;
  phoneVerified?: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function Index() {
  const [bookingType, setBookingType] = useState<"vin" | "manual">("vin");
  const [formData, setFormData] = useState({
    vin: "",
    make: "",
    model: "",
    year: "",
    address: "",
    phone: "",
    email: "",
    notes: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [showOTPModal, setShowOTPModal] = useState(false);
  const [showPhoneOTPModal, setShowPhoneOTPModal] = useState(false);
  const navigate = useNavigate();

  // Check for logged-in user on component mount
  useEffect(() => {
    const token = localStorage.getItem("authToken");
    const userData = localStorage.getItem("user");

    if (token && userData) {
      try {
        const parsedUser = JSON.parse(userData) as User;
        setUser(parsedUser);

        // Pre-fill email and phone if user is logged in
        setFormData((prev) => ({
          ...prev,
          email: parsedUser.email,
          phone: parsedUser.phone,
        }));
      } catch (error) {
        console.error("Failed to parse user data:", error);
        localStorage.removeItem("authToken");
        localStorage.removeItem("user");
      }
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("authToken");
    localStorage.removeItem("user");
    setUser(null);
    setFormData((prev) => ({
      ...prev,
      email: "",
      phone: "",
    }));
  };

  const handleEmailVerificationSuccess = () => {
    // Refresh user data from localStorage to get updated verification status
    const userData = localStorage.getItem("user");
    if (userData) {
      try {
        const updatedUser = JSON.parse(userData) as User;
        setUser(updatedUser);
        setSubmitMessage({
          type: "success",
          text: "Email verified successfully! You can now receive booking confirmations.",
        });
      } catch (error) {
        console.error("Failed to parse updated user data:", error);
      }
    }
  };

  const handlePhoneVerificationSuccess = () => {
    // Refresh user data from localStorage to get updated verification status
    const userData = localStorage.getItem("user");
    if (userData) {
      try {
        const updatedUser = JSON.parse(userData) as User;
        setUser(updatedUser);
        setSubmitMessage({
          type: "success",
          text: "Phone verified successfully! You can now receive SMS notifications.",
        });
      } catch (error) {
        console.error("Failed to parse updated user data:", error);
      }
    }
  };

  const handleOpenVerificationModal = () => {
    setShowOTPModal(true);
  };

  const handleOpenPhoneVerificationModal = () => {
    setShowPhoneOTPModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitMessage(null);

    try {
      // Validate required fields
      if (
        !formData.address?.trim() ||
        !formData.phone?.trim() ||
        !formData.email?.trim()
      ) {
        throw new Error("Please fill in all required fields");
      }

      if (bookingType === "vin" && !formData.vin?.trim()) {
        throw new Error("Please enter your vehicle VIN");
      }

      if (
        bookingType === "manual" &&
        (!formData.make?.trim() ||
          !formData.model?.trim() ||
          !formData.year?.trim())
      ) {
        throw new Error("Please fill in all vehicle information");
      }

      const bookingRequest: BookingRequest = {
        vehicleInfo:
          bookingType === "vin"
            ? { vin: formData.vin.trim() }
            : {
                make: formData.make.trim(),
                model: formData.model.trim(),
                year: formData.year.trim(),
              },
        serviceAddress: formData.address.trim(),
        customerInfo: {
          phone: formData.phone.trim(),
          email: formData.email.trim(),
        },
        notes: formData.notes?.trim() || undefined,
      };

      const response = await fetch("/api/bookings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(bookingRequest),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result: ApiResponse = await response.json();

      if (!result.success) {
        throw new Error(result.message || "Failed to create booking");
      }

      setSubmitMessage({
        type: "success",
        text: "Booking submitted successfully! We'll contact you shortly to confirm your appointment.",
      });

      // Reset form
      setFormData({
        vin: "",
        make: "",
        model: "",
        year: "",
        address: "",
        phone: "",
        email: "",
        notes: "",
      });
    } catch (error) {
      console.error("Booking submission error:", error);

      // Log additional details for debugging
      if (error instanceof Error) {
        console.error("Error details:", {
          message: error.message,
          stack: error.stack,
          bookingType,
          formData: {
            ...formData,
            // Don't log sensitive data completely
            email: formData.email ? "***@***" : "",
            phone: formData.phone ? "***-***-****" : "",
          },
        });
      }

      setSubmitMessage({
        type: "error",
        text:
          error instanceof Error
            ? error.message
            : "Failed to submit booking. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <div className="w-4 h-4 bg-white rounded-full"></div>
              </div>
              <span className="text-xl font-bold text-gray-900">OilSync</span>
            </div>
            <nav className="hidden md:flex space-x-8">
              <Link
                to="/services"
                className="text-gray-600 hover:text-primary transition-colors"
              >
                Services
              </Link>
              <Link
                to="/pricing"
                className="text-gray-600 hover:text-primary transition-colors"
              >
                Pricing
              </Link>
              <Link
                to="/about"
                className="text-gray-600 hover:text-primary transition-colors"
              >
                About
              </Link>
            </nav>
            <div className="flex items-center space-x-4">
              {user ? (
                <>
                  {!user.emailVerified && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleOpenVerificationModal}
                      className="border-orange-200 text-orange-700 hover:bg-orange-50"
                    >
                      <Mail className="w-4 h-4 mr-2" />
                      Verify Email
                    </Button>
                  )}
                  {!user.phoneVerified && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleOpenPhoneVerificationModal}
                      className="border-blue-200 text-blue-700 hover:bg-blue-50"
                    >
                      <Phone className="w-4 h-4 mr-2" />
                      Verify Phone
                    </Button>
                  )}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex items-center space-x-2"
                      >
                        <User className="w-4 h-4" />
                        <span>
                          {user.firstName} {user.lastName}
                        </span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => navigate("/profile")}>
                        <User className="w-4 h-4 mr-2" />
                        Profile
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => navigate("/my-appointments")}
                      >
                        <Calendar className="w-4 h-4 mr-2" />
                        My Appointments
                      </DropdownMenuItem>
                      {user.role === "admin" && (
                        <DropdownMenuItem>
                          <Link
                            to="/admin"
                            className="flex items-center w-full"
                          >
                            <Shield className="w-4 h-4 mr-2" />
                            Admin Dashboard
                          </Link>
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem onClick={handleLogout}>
                        <LogOut className="w-4 h-4 mr-2" />
                        Sign Out
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </>
              ) : (
                <>
                  <Link to="/login">
                    <Button variant="outline" size="sm">
                      Sign In
                    </Button>
                  </Link>
                  <Link to="/register">
                    <Button size="sm">Get Started</Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 lg:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <div className="space-y-4">
                <Badge className="bg-primary/10 text-primary border-primary/20">
                  Professional Service
                </Badge>
                <h1 className="text-4xl lg:text-6xl font-bold text-gray-900 leading-tight">
                  Oil Change <span className="text-primary">At Your Door</span>
                </h1>
                <p className="text-xl text-gray-600 leading-relaxed">
                  Skip the wait. Skip the drive. Professional oil change service
                  that comes to you. Book in minutes, get service in hours.
                </p>
              </div>
              <div className="flex flex-wrap gap-6 text-sm">
                <div className="flex items-center space-x-2">
                  <Shield className="w-5 h-5 text-primary" />
                  <span className="text-gray-600">Licensed & Insured</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Clock className="w-5 h-5 text-primary" />
                  <span className="text-gray-600">Same Day Service</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Users className="w-5 h-5 text-primary" />
                  <span className="text-gray-600">Expert Technicians</span>
                </div>
              </div>
            </div>

            {/* Booking Form */}
            <Card className="shadow-xl border-0">
              <CardHeader className="pb-4">
                <CardTitle className="text-2xl">Book Your Service</CardTitle>
                <CardDescription>
                  Quick and easy oil change booking
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {user && !user.emailVerified && (
                  <Alert className="border-orange-200 bg-orange-50">
                    <Mail className="h-4 w-4 text-orange-600" />
                    <AlertDescription className="text-orange-800">
                      Please verify your email address to ensure we can send you
                      booking confirmations.
                      <Button
                        variant="link"
                        className="h-auto p-0 ml-2 text-orange-700 hover:text-orange-900"
                        onClick={handleOpenVerificationModal}
                      >
                        Click here to verify
                      </Button>
                    </AlertDescription>
                  </Alert>
                )}
                {user && !user.phoneVerified && (
                  <Alert className="border-blue-200 bg-blue-50">
                    <Phone className="h-4 w-4 text-blue-600" />
                    <AlertDescription className="text-blue-800">
                      Please verify your phone number to receive SMS updates
                      about your appointment.
                      <Button
                        variant="link"
                        className="h-auto p-0 ml-2 text-blue-700 hover:text-blue-900"
                        onClick={handleOpenPhoneVerificationModal}
                      >
                        Click here to verify
                      </Button>
                    </AlertDescription>
                  </Alert>
                )}
                {submitMessage && (
                  <div
                    className={`p-4 rounded-lg ${
                      submitMessage.type === "success"
                        ? "bg-green-50 text-green-800 border border-green-200"
                        : "bg-red-50 text-red-800 border border-red-200"
                    }`}
                  >
                    {submitMessage.text}
                  </div>
                )}
                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* VIN or Manual Entry Toggle */}
                  {/* Enhanced Vehicle Selection */}
                  <VehicleSelector
                    value={{
                      vin: formData.vin,
                      make: formData.make,
                      model: formData.model,
                      year: formData.year,
                    }}
                    onChange={(vehicle) =>
                      setFormData({
                        ...formData,
                        vin: vehicle.vin,
                        make: vehicle.make,
                        model: vehicle.model,
                        year: vehicle.year,
                      })
                    }
                    entryMode={bookingType}
                    onEntryModeChange={setBookingType}
                  />

                  {/* Contact Information */}
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="address">Service Address</Label>
                      <AddressAutocomplete
                        value={formData.address}
                        onChange={(address) =>
                          setFormData({
                            ...formData,
                            address,
                          })
                        }
                        placeholder="Enter full address with house number (e.g., 7 Pointer Street)"
                        onSelect={(suggestion) => {
                          console.log("Selected address:", suggestion);
                        }}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="phone">Phone</Label>
                        <Input
                          id="phone"
                          type="tel"
                          placeholder="(555) 123-4567"
                          value={formData.phone}
                          onChange={(e) =>
                            setFormData({ ...formData, phone: e.target.value })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input
                          id="email"
                          type="email"
                          placeholder="your@email.com"
                          value={formData.email}
                          onChange={(e) =>
                            setFormData({ ...formData, email: e.target.value })
                          }
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="notes">Additional Notes (Optional)</Label>
                      <Textarea
                        id="notes"
                        placeholder="Any special instructions or requests?"
                        value={formData.notes}
                        onChange={(e) =>
                          setFormData({ ...formData, notes: e.target.value })
                        }
                        rows={3}
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    className="w-full"
                    size="lg"
                    disabled={isSubmitting}
                  >
                    <Calendar className="w-4 h-4 mr-2" />
                    {isSubmitting ? "Submitting..." : "Schedule Service"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center space-y-4 mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900">
              Why Choose OilSync?
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              We bring professional automotive service directly to your driveway
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                <Clock className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold">Convenient Scheduling</h3>
              <p className="text-gray-600">
                Book online in minutes. Choose a time that works for you.
              </p>
            </div>
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                <Users className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold">Expert Technicians</h3>
              <p className="text-gray-600">
                Certified professionals with years of experience.
              </p>
            </div>
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                <Shield className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold">Quality Guarantee</h3>
              <p className="text-gray-600">
                100% satisfaction guarantee on all services.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center space-y-4 mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900">
              What Our Customers Say
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                name: "Sarah Johnson",
                location: "Austin, TX",
                review:
                  "Amazing service! The technician arrived on time and did a thorough job. So convenient!",
                rating: 5,
              },
              {
                name: "Mike Chen",
                location: "San Francisco, CA",
                review:
                  "Best decision ever. No more waiting at the shop. Professional and efficient.",
                rating: 5,
              },
              {
                name: "Emily Rodriguez",
                location: "Miami, FL",
                review:
                  "The app makes booking so easy, and the service is top-notch. Highly recommend!",
                rating: 5,
              },
            ].map((testimonial, i) => (
              <Card key={i} className="border-0 shadow-sm">
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-center space-x-1">
                    {Array.from({ length: testimonial.rating }).map((_, j) => (
                      <Star
                        key={j}
                        className="w-4 h-4 fill-yellow-400 text-yellow-400"
                      />
                    ))}
                  </div>
                  <p className="text-gray-600 italic">"{testimonial.review}"</p>
                  <div>
                    <div className="font-semibold text-gray-900">
                      {testimonial.name}
                    </div>
                    <div className="text-sm text-gray-500">
                      {testimonial.location}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8">
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                  <div className="w-4 h-4 bg-white rounded-full"></div>
                </div>
                <span className="text-xl font-bold">OilSync</span>
              </div>
              <p className="text-gray-400">
                Professional mobile oil change service at your convenience.
              </p>
            </div>
            <div className="space-y-4">
              <h4 className="font-semibold">Services</h4>
              <ul className="space-y-2 text-gray-400">
                <li>
                  <Link
                    to="/services/oil-change"
                    className="hover:text-white transition-colors"
                  >
                    Oil Change
                  </Link>
                </li>
                <li>
                  <Link
                    to="/services/filter-replacement"
                    className="hover:text-white transition-colors"
                  >
                    Filter Replacement
                  </Link>
                </li>
                <li>
                  <Link
                    to="/services/maintenance"
                    className="hover:text-white transition-colors"
                  >
                    Basic Maintenance
                  </Link>
                </li>
              </ul>
            </div>
            <div className="space-y-4">
              <h4 className="font-semibold">Company</h4>
              <ul className="space-y-2 text-gray-400">
                <li>
                  <Link
                    to="/about"
                    className="hover:text-white transition-colors"
                  >
                    About Us
                  </Link>
                </li>
                <li>
                  <Link
                    to="/careers"
                    className="hover:text-white transition-colors"
                  >
                    Careers
                  </Link>
                </li>
                <li>
                  <Link
                    to="/contact"
                    className="hover:text-white transition-colors"
                  >
                    Contact
                  </Link>
                </li>
              </ul>
            </div>
            <div className="space-y-4">
              <h4 className="font-semibold">Support</h4>
              <ul className="space-y-2 text-gray-400">
                <li>
                  <Link
                    to="/help"
                    className="hover:text-white transition-colors"
                  >
                    Help Center
                  </Link>
                </li>
                <li>
                  <Link
                    to="/privacy"
                    className="hover:text-white transition-colors"
                  >
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link
                    to="/terms"
                    className="hover:text-white transition-colors"
                  >
                    Terms of Service
                  </Link>
                </li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-12 pt-8 text-center text-gray-400">
            <p>&copy; 2024 OilSync. All rights reserved.</p>
          </div>
        </div>
      </footer>
      {/* OTP Verification Modal */}
      <OTPVerificationModal
        isOpen={showOTPModal}
        onClose={() => setShowOTPModal(false)}
        email={user?.email || formData.email}
        onSuccess={handleEmailVerificationSuccess}
      />
      {/* Phone OTP Verification Modal */}
      <PhoneOTPVerificationModal
        isOpen={showPhoneOTPModal}
        onClose={() => setShowPhoneOTPModal(false)}
        phone={user?.phone || formData.phone}
        onSuccess={handlePhoneVerificationSuccess}
      />
    </div>
  );
}
