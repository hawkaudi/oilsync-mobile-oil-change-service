import { useState, useEffect } from "react";
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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  User,
  Mail,
  Phone,
  Calendar,
  Shield,
  Edit3,
  Save,
  X,
  LogOut,
  CheckCircle2,
  AlertTriangle,
  Home,
  Settings,
  Activity,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import OTPVerificationModal from "@/components/OTPVerificationModal";
import PhoneOTPVerificationModal from "@/components/PhoneOTPVerificationModal";

interface UserProfile {
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

export default function Profile() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showEmailOTP, setShowEmailOTP] = useState(false);
  const [showPhoneOTP, setShowPhoneOTP] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    phone: "",
  });
  const navigate = useNavigate();

  const refreshUserData = () => {
    const userData = localStorage.getItem("user");
    if (userData) {
      try {
        const parsedUser = JSON.parse(userData) as UserProfile;

        // Ensure verification fields exist (default to false if not present)
        const userWithVerification = {
          ...parsedUser,
          emailVerified: parsedUser.emailVerified ?? false,
          phoneVerified: parsedUser.phoneVerified ?? false,
        };

        console.log("Refreshed user data:", userWithVerification);
        setUser(userWithVerification);
        setFormData({
          firstName: userWithVerification.firstName,
          lastName: userWithVerification.lastName,
          phone: userWithVerification.phone,
        });
      } catch (error) {
        console.error("Failed to parse user data:", error);
      }
    }
  };

  useEffect(() => {
    const token = localStorage.getItem("authToken");
    const userData = localStorage.getItem("user");

    if (!token || !userData) {
      navigate("/login");
      return;
    }

    try {
      const parsedUser = JSON.parse(userData) as UserProfile;

      // Ensure verification fields exist (default to false if not present)
      const userWithVerification = {
        ...parsedUser,
        emailVerified: parsedUser.emailVerified ?? false,
        phoneVerified: parsedUser.phoneVerified ?? false,
      };

      console.log("Initial user data:", userWithVerification);
      setUser(userWithVerification);
      setFormData({
        firstName: userWithVerification.firstName,
        lastName: userWithVerification.lastName,
        phone: userWithVerification.phone,
      });
    } catch (error) {
      console.error("Failed to parse user data:", error);
      navigate("/login");
    }
  }, [navigate]);

  // Listen for localStorage changes to update verification status
  useEffect(() => {
    const handleStorageChange = () => {
      refreshUserData();
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("authToken");
    localStorage.removeItem("user");
    navigate("/");
  };

  const handleEdit = () => {
    setIsEditing(true);
    setMessage(null);
  };

  const handleCancel = () => {
    if (user) {
      setFormData({
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
      });
    }
    setIsEditing(false);
    setMessage(null);
  };

  const handleSave = async () => {
    setIsSaving(true);
    setMessage(null);

    try {
      // Validate input
      if (
        !formData.firstName.trim() ||
        !formData.lastName.trim() ||
        !formData.phone.trim()
      ) {
        throw new Error("All fields are required");
      }

      // Here you would make an API call to update the user profile
      // For now, just update localStorage
      const updatedUser = {
        ...user!,
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        phone: formData.phone.trim(),
        updatedAt: new Date().toISOString(),
      };

      localStorage.setItem("user", JSON.stringify(updatedUser));
      setUser(updatedUser);
      setIsEditing(false);

      setMessage({
        type: "success",
        text: "Profile updated successfully!",
      });
    } catch (error) {
      setMessage({
        type: "error",
        text:
          error instanceof Error ? error.message : "Failed to update profile",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleEmailVerificationSuccess = () => {
    console.log("Email verification success callback triggered");
    // The verification modal already updates localStorage, so just refresh
    refreshUserData();
    setMessage({
      type: "success",
      text: "Email verified successfully!",
    });
  };

  const handlePhoneVerificationSuccess = () => {
    console.log("Phone verification success callback triggered");
    // The verification modal already updates localStorage, so just refresh
    refreshUserData();
    setMessage({
      type: "success",
      text: "Phone verified successfully!",
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "admin":
        return "bg-red-100 text-red-800 border-red-200";
      case "technician":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "customer":
        return "bg-green-100 text-green-800 border-green-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getVerificationStatus = () => {
    const emailVerified = user?.emailVerified ?? false;
    const phoneVerified = user?.phoneVerified ?? false;

    // Debug logging to check actual values
    console.log("Profile Verification Status Debug:", {
      emailVerified,
      phoneVerified,
      user: user
        ? {
            id: user.id,
            email: user.email,
            emailVerified: user.emailVerified,
            phoneVerified: user.phoneVerified,
          }
        : null,
    });

    if (emailVerified && phoneVerified) {
      return {
        status: "complete",
        icon: CheckCircle2,
        text: "Account Fully Verified",
        className: "text-green-600 bg-green-50 border-green-200",
      };
    } else if (emailVerified || phoneVerified) {
      return {
        status: "partial",
        icon: AlertTriangle,
        text: "Verification Incomplete",
        className: "text-orange-600 bg-orange-50 border-orange-200",
      };
    } else {
      return {
        status: "none",
        icon: AlertTriangle,
        text: "Account Not Verified",
        className: "text-red-600 bg-red-50 border-red-200",
      };
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  const verificationStatus = getVerificationStatus();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link to="/" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <div className="w-4 h-4 bg-white rounded-full"></div>
              </div>
              <span className="text-xl font-bold text-gray-900">OilSync</span>
            </Link>

            {/* Navigation */}
            <nav className="hidden md:flex items-center space-x-4">
              <Link
                to="/"
                className="flex items-center space-x-2 text-gray-600 hover:text-primary transition-colors px-3 py-2 rounded-md"
              >
                <Home className="w-4 h-4" />
                <span>Home</span>
              </Link>
              <Link
                to="/my-appointments"
                className="flex items-center space-x-2 text-gray-600 hover:text-primary transition-colors px-3 py-2 rounded-md"
              >
                <Calendar className="w-4 h-4" />
                <span>Appointments</span>
              </Link>
              <div className="flex items-center space-x-2 text-primary px-3 py-2 rounded-md bg-primary/10">
                <User className="w-4 h-4" />
                <span>Profile</span>
              </div>
            </nav>

            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">
                Welcome, {user.firstName}
              </span>
              <Button variant="outline" size="sm" onClick={handleLogout}>
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Profile Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="space-y-6">
          {/* Profile Header */}
          <div className="text-center space-y-4">
            <div className="w-24 h-24 bg-primary rounded-full flex items-center justify-center mx-auto">
              <User className="w-12 h-12 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {user.firstName} {user.lastName}
              </h1>
              <div className="flex justify-center items-center space-x-2 mt-2">
                <Badge className={getRoleBadgeColor(user.role)}>
                  {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                </Badge>
                {user.role === "admin" && (
                  <Shield className="w-4 h-4 text-red-600" />
                )}
              </div>
            </div>
          </div>

          {/* Verification Status Card */}
          <Card className={`border-2 ${verificationStatus.className}`}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <verificationStatus.icon className="w-8 h-8" />
                  <div>
                    <h3 className="font-semibold text-lg">
                      {verificationStatus.text}
                    </h3>
                    <p className="text-sm opacity-80">
                      {verificationStatus.status === "complete" &&
                        "Your account is fully verified and secure."}
                      {verificationStatus.status === "partial" &&
                        "Complete verification for full access to features."}
                      {verificationStatus.status === "none" &&
                        "Verify your email and phone for enhanced security."}
                    </p>
                  </div>
                </div>
                <div className="flex flex-col space-y-2">
                  {!user.emailVerified && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setShowEmailOTP(true)}
                      className="border-current text-current hover:bg-current hover:text-white"
                    >
                      <Mail className="w-4 h-4 mr-2" />
                      Verify Email
                    </Button>
                  )}
                  {!user.phoneVerified && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setShowPhoneOTP(true)}
                      className="border-current text-current hover:bg-current hover:text-white"
                    >
                      <Phone className="w-4 h-4 mr-2" />
                      Verify Phone
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Alert Messages */}
          {message && (
            <Alert
              className={
                message.type === "error"
                  ? "border-red-200 bg-red-50"
                  : "border-green-200 bg-green-50"
              }
            >
              <AlertDescription
                className={
                  message.type === "error" ? "text-red-800" : "text-green-800"
                }
              >
                {message.text}
              </AlertDescription>
            </Alert>
          )}

          {/* Profile Information */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Profile Information</CardTitle>
                <CardDescription>
                  Manage your personal information
                </CardDescription>
              </div>
              {!isEditing ? (
                <Button variant="outline" onClick={handleEdit}>
                  <Edit3 className="w-4 h-4 mr-2" />
                  Edit Profile
                </Button>
              ) : (
                <div className="flex space-x-2">
                  <Button variant="outline" onClick={handleCancel}>
                    <X className="w-4 h-4 mr-2" />
                    Cancel
                  </Button>
                  <Button onClick={handleSave} disabled={isSaving}>
                    <Save className="w-4 h-4 mr-2" />
                    {isSaving ? "Saving..." : "Save"}
                  </Button>
                </div>
              )}
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  {isEditing ? (
                    <Input
                      id="firstName"
                      value={formData.firstName}
                      onChange={(e) =>
                        setFormData({ ...formData, firstName: e.target.value })
                      }
                      placeholder="Enter your first name"
                    />
                  ) : (
                    <div className="flex items-center space-x-2 p-2 bg-gray-50 rounded-md">
                      <User className="w-4 h-4 text-gray-500" />
                      <span>{user.firstName}</span>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  {isEditing ? (
                    <Input
                      id="lastName"
                      value={formData.lastName}
                      onChange={(e) =>
                        setFormData({ ...formData, lastName: e.target.value })
                      }
                      placeholder="Enter your last name"
                    />
                  ) : (
                    <div className="flex items-center space-x-2 p-2 bg-gray-50 rounded-md">
                      <User className="w-4 h-4 text-gray-500" />
                      <span>{user.lastName}</span>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <div className="flex items-center justify-between p-2 bg-gray-50 rounded-md">
                    <div className="flex items-center space-x-2">
                      <Mail className="w-4 h-4 text-gray-500" />
                      <span>{user.email}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      {user.emailVerified ? (
                        <Badge
                          variant="secondary"
                          className="bg-green-100 text-green-800 border-green-200"
                        >
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          Verified
                        </Badge>
                      ) : (
                        <Badge
                          variant="secondary"
                          className="bg-orange-100 text-orange-800 border-orange-200"
                        >
                          <AlertTriangle className="w-3 h-3 mr-1" />
                          Unverified
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  {isEditing ? (
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) =>
                        setFormData({ ...formData, phone: e.target.value })
                      }
                      placeholder="Enter your phone number"
                    />
                  ) : (
                    <div className="flex items-center justify-between p-2 bg-gray-50 rounded-md">
                      <div className="flex items-center space-x-2">
                        <Phone className="w-4 h-4 text-gray-500" />
                        <span>{user.phone}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        {user.phoneVerified ? (
                          <Badge
                            variant="secondary"
                            className="bg-green-100 text-green-800 border-green-200"
                          >
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            Verified
                          </Badge>
                        ) : (
                          <Badge
                            variant="secondary"
                            className="bg-orange-100 text-orange-800 border-orange-200"
                          >
                            <AlertTriangle className="w-3 h-3 mr-1" />
                            Unverified
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Account Created</Label>
                  <div className="flex items-center space-x-2 p-2 bg-gray-50 rounded-md">
                    <Calendar className="w-4 h-4 text-gray-500" />
                    <span>{formatDate(user.createdAt)}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Last Updated</Label>
                  <div className="flex items-center space-x-2 p-2 bg-gray-50 rounded-md">
                    <Calendar className="w-4 h-4 text-gray-500" />
                    <span>{formatDate(user.updatedAt)}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Common tasks and navigation</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Link to="/my-appointments">
                  <Button
                    variant="outline"
                    className="w-full justify-start h-12"
                  >
                    <Activity className="w-4 h-4 mr-2" />
                    <div className="text-left">
                      <div>My Appointments</div>
                      <div className="text-xs text-gray-500">
                        View booking history
                      </div>
                    </div>
                  </Button>
                </Link>
                <Link to="/forgot-password">
                  <Button
                    variant="outline"
                    className="w-full justify-start h-12"
                  >
                    <Settings className="w-4 h-4 mr-2" />
                    <div className="text-left">
                      <div>Change Password</div>
                      <div className="text-xs text-gray-500">
                        Update security
                      </div>
                    </div>
                  </Button>
                </Link>
                {user.role === "admin" && (
                  <Link to="/admin">
                    <Button
                      variant="outline"
                      className="w-full justify-start h-12"
                    >
                      <Shield className="w-4 h-4 mr-2" />
                      <div className="text-left">
                        <div>Admin Dashboard</div>
                        <div className="text-xs text-gray-500">
                          Manage system
                        </div>
                      </div>
                    </Button>
                  </Link>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Verification Modals */}
      <OTPVerificationModal
        isOpen={showEmailOTP}
        onClose={() => setShowEmailOTP(false)}
        email={user.email}
        onSuccess={handleEmailVerificationSuccess}
      />

      <PhoneOTPVerificationModal
        isOpen={showPhoneOTP}
        onClose={() => setShowPhoneOTP(false)}
        phone={user.phone}
        onSuccess={handlePhoneVerificationSuccess}
      />
    </div>
  );
}
