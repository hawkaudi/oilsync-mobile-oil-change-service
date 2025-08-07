import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Phone, CheckCircle, Loader2 } from "lucide-react";

interface PhoneOTPVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  phone: string;
  onSuccess: () => void;
}

export default function PhoneOTPVerificationModal({
  isOpen,
  onClose,
  phone,
  onSuccess,
}: PhoneOTPVerificationModalProps) {
  const [otpCode, setOtpCode] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

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
          identifier: phone,
          type: "sms",
          purpose: "verify_phone",
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Failed to send verification code");
      }

      setMessage({
        type: "success",
        text: "Verification code sent to your phone!",
      });
    } catch (error) {
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Failed to send code",
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
      const response = await fetch("/api/auth/verify-phone", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          identifier: phone,
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
          "Phone verification - updating localStorage with:",
          result.user,
        );
        localStorage.setItem("user", JSON.stringify(result.user));
        console.log("Phone verification - localStorage updated successfully");
      } else {
        console.warn("Phone verification - no user data returned from server");
      }

      setIsVerified(true);
      setMessage({
        type: "success",
        text: "Phone verified successfully!",
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
              <Phone className="w-5 h-5 text-blue-600" />
            )}
            <span>{isVerified ? "Phone Verified!" : "Verify Your Phone"}</span>
          </DialogTitle>
          <DialogDescription>
            {isVerified
              ? "Your phone number has been successfully verified."
              : `We'll send a verification code to ${phone}`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {!isVerified && (
            <>
              <div className="space-y-2">
                <Button
                  onClick={handleSendOTP}
                  disabled={isSending}
                  className="w-full"
                  variant="outline"
                >
                  {isSending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Sending Code...
                    </>
                  ) : (
                    <>
                      <Phone className="w-4 h-4 mr-2" />
                      Send Verification Code
                    </>
                  )}
                </Button>
              </div>

              <div className="space-y-2">
                <Label htmlFor="otp">Verification Code</Label>
                <Input
                  id="otp"
                  type="text"
                  placeholder="Enter 6-digit code"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value)}
                  maxLength={6}
                  disabled={isSubmitting}
                />
              </div>

              <Button
                onClick={handleVerifyOTP}
                disabled={isSubmitting || !otpCode.trim()}
                className="w-full"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  "Verify Phone"
                )}
              </Button>
            </>
          )}

          {message && (
            <Alert
              className={
                message.type === "success"
                  ? "border-green-200 bg-green-50"
                  : "border-red-200 bg-red-50"
              }
            >
              <AlertDescription
                className={
                  message.type === "success" ? "text-green-800" : "text-red-800"
                }
              >
                {message.text}
              </AlertDescription>
            </Alert>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
