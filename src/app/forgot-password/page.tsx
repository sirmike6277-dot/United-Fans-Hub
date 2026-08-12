import type { Metadata } from "next";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { AuthVisual } from "@/components/auth/AuthVisual";
import { AuthHeader } from "@/components/auth/AuthHeader";
import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";

export const metadata: Metadata = {
  title: "Reset Your Password — United Fans Hub",
  description:
    "Enter the email address associated with your United Fans Hub account and we'll send you a reset link.",
};

export default function ForgotPasswordPage() {
  return (
    <AuthLayout visual={<AuthVisual />}>
      <AuthHeader
        heading="Reset Your Password"
        subtext="Enter the email address associated with your United Fans Hub account and we'll send you a reset link."
      />
      <ForgotPasswordForm />
    </AuthLayout>
  );
}
