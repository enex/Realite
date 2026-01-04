import { useTokenRefresh } from "../client/token-refresh";

export default function TokenRefreshHandler() {
  // Initialize the token refresh hook
  useTokenRefresh();

  // This component doesn't render anything, it just handles token refresh
  return null;
}
