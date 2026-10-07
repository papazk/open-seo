import { createServerFn } from "@tanstack/react-start";
import { VersionStatusService } from "@/server/features/version/VersionStatusService";
import { requireAuthenticatedContext } from "./middleware";

export const getVersionStatus = createServerFn({ method: "GET" })
  .middleware(requireAuthenticatedContext)
  .handler(() => VersionStatusService.getStatus());
