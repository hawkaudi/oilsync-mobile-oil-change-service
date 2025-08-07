import { useState } from "react";
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
import { Eye, EyeOff, Mail, Lock, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import {
  OTPRequest,
  OTPVerifyRequest,
  ResetPasswordRequest,
  ApiResponse,
} from "@shared/api";

type Step = "email" | "verify" | "reset" | "success";

export default function ForgotPassword() {
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const request: OTPRequest = {
        identifier: email,
        type: "email",
        purpose: "reset_password",
      };

      const response = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request),
      });

      const result: ApiResponse = await response.json();

      if (!result.success) {
        throw new Error(result.message || "Failed to send OTP");
      }

      setStep("verify");
      // Show success message for development
      console.log(
        "✅ OTP sent successfully! Check the Netlify logs for the verification code.",
      );
      console.log(
        "📧 In development mode, the OTP code will be displayed in server logs.",
      );
    } catch (error) {
      setError(error instanceof Error ? error.message : "Failed to send OTP");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const request: OTPVerifyRequest = {
        identifier: email,
        code: otpCode,
        purpose: "reset_password",
      };

      const response = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request),
      });

      const result: ApiResponse = await response.json();

      if (!result.success) {
        throw new Error(result.message || "Invalid OTP code");
      }

      setStep("reset");
    } catch (error) {
      setError(error instanceof Error ? error.message : "Failed to verify OTP");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      setIsLoading(false);
      return;
    }

    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters long");
      setIsLoading(false);
      return;
    }

    try {
      const request: ResetPasswordRequest = {
        identifier: email,
        newPassword,
        otpCode,
      };

      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request),
      });

      const result: ApiResponse = await response.json();

      if (!result.success) {
        throw new Error(result.message || "Failed to reset password");
      }

      setStep("success");
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Failed to reset password",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const renderStepContent = () => {
    switch (step) {
      case "email":
        return (
          <form onSubmit={handleSendOTP} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
              <p className="text-sm text-muted-foreground">
                We'll send you a verification code to reset your password.
              </p>
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Sending..." : "Send Verification Code"}
            </Button>
          </form>
        );

      case "verify":
        return (
          <form onSubmit={handleVerifyOTP} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="otp">Verification Code</Label>
              <Input
                id="otp"
                type="text"
                placeholder="Enter 6-digit code"
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value)}
                maxLength={6}
                required
              />
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  Check your email for the verification code we sent to {email}.
                </p>
                {process.env.NODE_ENV === "development" && (
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-xs text-blue-700">
                      <strong>Development Mode:</strong> Check the browser
                      console or Netlify function logs for the verification
                      code.
                    </p>
                  </div>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Button
                type="submit"
                className="w-full"
                disabled={isLoading || otpCode.length !== 6}
              >
                {isLoading ? "Verifying..." : "Verify Code"}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => setStep("email")}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Email
              </Button>
            </div>
          </form>
        );

      case "reset":
        return (
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="newPassword">New Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="newPassword"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter new password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="pl-10 pr-10"
                  required
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <Input
                id="confirmPassword"
                type={showPassword ? "text" : "password"}
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Resetting..." : "Reset Password"}
            </Button>
          </form>
        );

      case "success":
        return (
          <div className="text-center space-y-4">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
              <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                <div className="w-3 h-3 bg-white rounded-full"></div>
              </div>
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">
                Password Reset Successfully
              </h3>
              <p className="text-muted-foreground">
                Your password has been reset. You can now sign in with your new
                password.
              </p>
            </div>
            <Link to="/login">
              <Button className="w-full">Sign In Now</Button>
            </Link>
          </div>
        );

      default:
        return null;
    }
  };

  const getStepTitle = () => {
    switch (step) {
      case "email":
        return "Reset Password";
      case "verify":
        return "Verify Email";
      case "reset":
        return "Set New Password";
      case "success":
        return "Password Reset";
      default:
        return "Reset Password";
    }
  };

  const getStepDescription = () => {
    switch (step) {
      case "email":
        return "Enter your email to receive a verification code";
      case "verify":
        return "Enter the verification code sent to your email";
      case "reset":
        return "Create a new password for your account";
      case "success":
        return "Your password has been successfully reset";
      default:
        return "";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <Link
            to="/"
            className="inline-flex items-center space-x-2 text-primary hover:text-primary/80 transition-colors"
          >
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <div className="w-4 h-4 bg-white rounded-full"></div>
            </div>
            <span className="text-xl font-bold">OilSync</span>
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">{getStepTitle()}</h1>
          <p className="text-gray-600">{getStepDescription()}</p>
        </div>

        {/* Reset Form */}
        <Card>
          <CardHeader className="space-y-1 pb-4">
            <CardTitle>{getStepTitle()}</CardTitle>
            <CardDescription>{getStepDescription()}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {renderStepContent()}
          </CardContent>
        </Card>

        {/* Back to Login */}
        {step === "email" && (
          <div className="text-center text-sm">
            <span className="text-gray-600">Remember your password? </span>
            <Link
              to="/login"
              className="text-primary hover:text-primary/80 transition-colors font-medium"
            >
              Sign in
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
