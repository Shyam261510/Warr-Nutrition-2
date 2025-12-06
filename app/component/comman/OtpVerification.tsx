"use client";

import type React from "react";
import { useState, useEffect, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, RefreshCw, CheckCircle, XCircle } from "lucide-react";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import axios from "axios";
import { toast } from "sonner";
import { signIn } from "next-auth/react";
import { useDispatch } from "react-redux";
import { setIsLoginDialoagOpen } from "@/utils/DataSlice";
import { CustomToast } from "./customToast";

interface OTPVerificationProps {
  email: string;
  user: any;
  onBack: () => void;
  title: string;
  description: string;
}

export function OTPVerification({
  email,
  user,
  onBack,
  title,
  description,
}: OTPVerificationProps) {
  const dispatch = useDispatch();
  const [isPending, startTransition] = useTransition();
  const [isResending, startResending] = useTransition();
  const [timeLeft, setTimeLeft] = useState(30);

  const FormSchema = z.object({
    code: z.string().min(6, {
      message: "Your one-time password must be 6 characters.",
    }),
  });

  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: { code: "" },
  });

  useEffect(() => {
    if (timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [timeLeft]);

  function handleResendOtp() {
    startResending(async () => {
      try {
        const res = await axios.post("/api/otp/send-otp", {
          subject: "Warr Nutritions Login OTP",
          notifer_email: email,
        });
        const { success, message } = res.data;

        if (success) {
          toast.success(message, {
            icon: <CheckCircle className="w-5 h-5 text-green-600" />,
            style: { border: "1px solid #22C55E", color: "#16A34A" },
          });
        } else {
          toast.error(message || "Failed to resend OTP", {
            icon: <XCircle className="w-5 h-5 text-red-600" />,
            style: { border: "1px solid #F87171", color: "#B91C1C" },
          });
        }
      } catch (error: any) {
        console.log("Error resending OTP:", error);
        toast.error(
          error.response?.data?.message ||
            "Something went wrong while resending OTP",
          {
            icon: <XCircle className="w-5 h-5 text-red-600" />,
            style: { border: "1px solid #F87171", color: "#B91C1C" },
          }
        );
      }
    });
  }

  function onSubmit(values: z.infer<typeof FormSchema>) {
    const { code } = values;

    startTransition(async () => {
      try {
        const res = await axios.post("/api/otp/verify-otp", {
          userId: user.id ? user.id : localStorage.getItem("userId"),
          code,
        });

        const { success, message } = res.data;

        if (!success) {
          CustomToast({
            message,
            type: "error",
            icon: <XCircle className="w-5 h-5 text-red-600" />,
          });
          return;
        }

        await signIn("credentials", {
          user: JSON.stringify(user),
          redirect: false,
        });

        localStorage.setItem("userId", "");
        dispatch(setIsLoginDialoagOpen(false));
        CustomToast({
          message,
          type: "success",
          icon: <CheckCircle className="w-5 h-5 text-green-600" />,
        });
      } catch (error: any) {
        console.log("OTP verification error:", error);
        CustomToast({
          message:
            error.response?.data?.message ||
            "Something went wrong during OTP verification",
          type: "error",
          icon: <XCircle className="w-5 h-5 text-red-600" />,
        });
      }
    });
  }

  return (
    <div className="flex items-center justify-center p-4">
      <div>
        {/* Header */}
        <div className="text-center space-y-4 mb-6">
          <h2 className="text-2xl font-bold text-[#D7223B]">{title}</h2>
          <p className="text-gray-600">{description}</p>
          <p className="text-sm text-gray-500">
            Code sent to:{" "}
            <span className="font-medium text-rose-800">{email}</span>
          </p>
        </div>

        {/* OTP Form */}
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* OTP Input Fields */}
            <div className="flex justify-center space-x-2">
              <FormField
                control={form.control}
                name="code"
                render={({ field }) => (
                  <FormItem className="flex flex-col items-center gap-2">
                    <FormLabel>One-Time Password</FormLabel>
                    <FormControl>
                      <InputOTP maxLength={6} {...field}>
                        <InputOTPGroup>
                          <InputOTPSlot index={0} />
                          <InputOTPSlot index={1} />
                          <InputOTPSlot index={2} />
                          <InputOTPSlot index={3} />
                          <InputOTPSlot index={4} />
                          <InputOTPSlot index={5} />
                        </InputOTPGroup>
                      </InputOTP>
                    </FormControl>
                    <FormDescription>
                      Please enter the one-time password sent to your phone.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={isPending}
              className="w-full bg-gradient-to-br from-[#B50D27] to-[#DA203A] hover:bg-gradient-to-br hover:from-[#D63A4E] hover:to-[#EF5161] text-white font-medium py-2 px-4 rounded-lg transition-all duration-200 disabled:opacity-50"
            >
              {isPending ? (
                <div className="flex items-center justify-center space-x-2">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Verifying...</span>
                </div>
              ) : (
                <div className="flex items-center justify-center space-x-2">
                  <CheckCircle className="w-4 h-4" />
                  <span>Verify Code</span>
                </div>
              )}
            </Button>

            {/* Resend Code */}
            <div className="text-center space-y-2">
              <p className="text-sm text-gray-600">
                Didn&apos;t receive the code?
              </p>
              {timeLeft > 0 ? (
                <p className="text-sm text-gray-500">
                  Resend code in{" "}
                  <span className="font-medium text-rose-800">{timeLeft}s</span>
                </p>
              ) : (
                <Button
                  type="button"
                  variant="link"
                  onClick={handleResendOtp}
                  disabled={isResending}
                  className="text-red-800 hp-0"
                >
                  {isResending ? (
                    <div className="flex items-center space-x-1">
                      <RefreshCw className="w-3 h-3 animate-spin" />
                      <span>Resending...</span>
                    </div>
                  ) : (
                    "Resend Code"
                  )}
                </Button>
              )}
            </div>

            {/* Back Button */}
            <div className="text-center">
              <Button
                type="button"
                variant="ghost"
                onClick={onBack}
                className="text-gray-600 hover:text-[#173C80] transition-colors"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Login
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}
