"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";

export function DeleteUserButton({
  userId,
  userName
}: {
  userId: string;
  userName: string;
}) {
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function removeUser() {
    const confirmed = window.confirm(`Delete ${userName}? This action cannot be undone.`);

    if (!confirmed) {
      return;
    }

    setMessage(null);

    startTransition(async () => {
      const response = await fetch("/api/admin/users", {
        method: "DELETE",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({
          userId
        })
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        setMessage(payload?.error ?? "Could not delete user.");
        return;
      }

      window.location.reload();
    });
  }

  return (
    <div className="flex items-center gap-3">
      {message ? <div className="text-sm text-destructive">{message}</div> : null}
      <Button type="button" variant="outline" onClick={removeUser} disabled={isPending}>
        {isPending ? "Deleting..." : "Delete User"}
      </Button>
    </div>
  );
}
