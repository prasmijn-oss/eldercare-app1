import { createContext, useContext } from "react";

// Holds the loaded permissions object (same shape as LOADED_PERMS in utils.js).
// Provided by App at the root; consumed by any component that needs reactive
// permission checks without prop-drilling.
export const PermissionsContext = createContext(null);

// Returns the current perms object from context.
// Pass the returned value as the 3rd argument to can(role, action, perms).
export function usePermissions() {
  return useContext(PermissionsContext);
}
