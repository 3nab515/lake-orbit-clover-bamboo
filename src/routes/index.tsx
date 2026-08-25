import { createFileRoute } from "@tanstack/react-router";
import { LabApp } from "@/components/witness/lab-app";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  return (
    <main className="min-h-screen bg-bg">
      <LabApp />
    </main>
  );
}
