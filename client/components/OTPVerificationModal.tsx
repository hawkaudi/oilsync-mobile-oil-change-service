import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Mail, CheckCircle, X } from "lucide-react";

interface OTPVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  email: string;
  onSuccess: () => void;
}

export default function OTPVerificationModal({
  isOpen,
  onClose,
  email,
  onSuccess,
}: OTPVerificationModalProps) {
  const [otpCode, setOtpCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [isVerified, setIsVerified] = useState(false);

  const handleSendOTP = async () => {
    setIsSending(true);
    setMessage(null);

    try {
      const response = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          identifier: email,
          type: "email",
          purpose: "verify_email",
        }),
      });

      const result = await response.json();

      if (result.success) {
        setMessage({
          type: "success",
          text: "Verification code sent to your email! Check your inbox.",
        });
      } else {
        throw new Error(result.message || "Failed to send verification code");
      }
    } catch (error) {
      setMessage({
        type: "error",
        text:
          error instanceof Error
            ? error.message
            : "Failed to send verification code",
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (!otpCode.trim()) {
      setMessage({
        type: "error",
        text: "Please enter the verification code",
      });
      return;
    }

    setIsSubmitting(true);
    setMessage(null);

    try {
      const response = await fetch("/api/auth/verify-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          identifier: email,
          otpCode: otpCode.trim(),
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Verification failed");
      }

      // Update user data in localStorage if provided
      if (result.user) {
        console.log(
          "Email verification - updating localStorage with:",
          result.user,
        );
        localStorage.setItem("user", JSON.stringify(result.user));
        console.log("Email verification - localStorage updated successfully");
      } else {
        console.warn("Email verification - no user data returned from server");
      }

      setIsVerified(true);
      setMessage({
        type: "success",
        text: "Email verified successfully!",
      });

      // Close modal and trigger success callback after 2 seconds
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 2000);
    } catch (error) {
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Verification failed",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting && !isSending) {
      setOtpCode("");
      setMessage(null);
      setIsVerified(false);
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            {isVerified ? (
              <CheckCircle className="w-5 h-5 text-green-600" />
            ) : (
              <Mail className="w-5 h-5 text-blue-600" />
            )}
            <span>{isVerified ? "Email Verified!" : "Verify Your Email"}</span>
          </DialogTitle>
          <DialogDescription>
            {isVerified
              ? "Your email has been successfully verified."
              : `Enter the verification code sent to ${email}`}
          </DialogDescription>
        </DialogHeader>

        {!isVerified && (
          <div className="space-y-4">
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

            <div className="space-y-2">
              <Label htmlFor="otpCode">Verification Code</Label>
              <div className="flex space-x-2">
                <Input
                  id="otpCode"
                  placeholder="Enter 6-digit code"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value)}
                  maxLength={6}
                  className="text-center text-lg tracking-wider"
                />
                <Button
                  variant="outline"
                  onClick={handleSendOTP}
                  disabled={isSending}
                  className="whitespace-nowrap"
                >
                  {isSending ? "Sending..." : "Send Code"}
                </Button>
              </div>
            </div>
          </div>
        )}

        <DialogFooter className="flex justify-between sm:justify-between">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isSubmitting || isSending}
          >
            <X className="w-4 h-4 mr-2" />
            {isVerified ? "Close" : "Cancel"}
          </Button>

          {!isVerified && (
            <Button
              onClick={handleVerifyOTP}
              disabled={isSubmitting || !otpCode.trim()}
              className="ml-2"
            >
              {isSubmitting ? "Verifying..." : "Verify Email"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
