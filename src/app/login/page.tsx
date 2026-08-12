import type { Metadata } from "next";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { AuthVisual } from "@/components/auth/AuthVisual";
import { AuthHeader } from "@/components/auth/AuthHeader";
import { AuthFooter } from "@/components/auth/AuthFooter";
import { LoginForm } from "@/components/auth/LoginForm";

export const metadata: Metadata = {
  title: "Login — United Fans Hub",
  description: "Sign in to continue your United journey.",
};

export default function LoginPage() {
  return (
    <AuthLayout visual={<AuthVisual />}>
      <AuthHeader
        heading="Welcome Back, Red."
        subtext="Sign in to continue your United journey."
      />
      <LoginForm />
      <AuthFooter prompt="Don't have an account?" linkText="Create an account" href="/signup" />
    </AuthLayout>
  );
}
