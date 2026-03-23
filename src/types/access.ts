import type { Domain, Membership, User } from "@prisma/client";

export type AccessContext = {
  user: Pick<User, "id" | "email" | "name" | "role">;
  membership: (Membership & { domain: Domain }) | null;
  isAdmin: boolean;
  domainId: string | null;
  domainSlug: string | null;
};
