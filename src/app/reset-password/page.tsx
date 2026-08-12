import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { AuthVisual } from "@/components/auth/AuthVisual";
import { AuthHeader } from "@/components/auth/AuthHeader";
import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";

export const metadata: Metadata = {
  title: "Set a New Password — United Fans Hub",
  description: "Choose a new password for your United Fans Hub account.",
};

export default function ResetPasswordPage() {
  return (
    <AuthLayout visual={<AuthVisual />}>
      <AuthHeader heading="Set a New Password" subtext="Choose a new password for your account." />
      <Suspense fallback={null}>
        <ResetPasswordForm />
      </Suspense>
    </AuthLayout>
  );
}
