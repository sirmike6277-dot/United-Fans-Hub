import { AuthLayout } from "@/components/auth/AuthLayout";
import { AuthVisual } from "@/components/auth/AuthVisual";
import { AuthFormSkeleton } from "@/components/auth/AuthFormSkeleton";

export default function ForgotPasswordLoading() {
  return (
    <AuthLayout visual={<AuthVisual />}>
      <AuthFormSkeleton />
    </AuthLayout>
  );
}
