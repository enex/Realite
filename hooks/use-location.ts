import * as Location from "expo-location";
import { useEffect, useState } from "react";

interface LocationState {
  latitude: number;
  longitude: number;
  hasPermission: boolean;
  isLoading: boolean;
  error: string | null;
}

export function useLocation() {
  const [locationState, setLocationState] = useState<LocationState>({
    latitude: 0,
    longitude: 0,
    hasPermission: false,
    isLoading: true,
    error: null,
  });

  useEffect(() => {
    let isMounted = true;

    const getLocation = async () => {
      try {
        // Prüfe Permission-Status
        const { status } = await Location.requestForegroundPermissionsAsync();

        if (status !== Location.PermissionStatus.GRANTED) {
          if (isMounted) {
            setLocationState({
              latitude: 0,
              longitude: 0,
              hasPermission: false,
              isLoading: false,
              error: "Location permission denied",
            });
          }
          return;
        }

        // Hole aktuelle Position
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
          timeInterval: 10000, // 10 Sekunden Cache
        });

        if (isMounted) {
          setLocationState({
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            hasPermission: true,
            isLoading: false,
            error: null,
          });
        }
      } catch (error) {
        console.warn("Error getting location:", error);
        if (isMounted) {
          setLocationState({
            latitude: 0,
            longitude: 0,
            hasPermission: false,
            isLoading: false,
            error:
              error instanceof Error ? error.message : "Unknown location error",
          });
        }
      }
    };

    void getLocation();

    return () => {
      isMounted = false;
    };
  }, []);

  const requestPermission = async (
    accuracy: Location.Accuracy = Location.Accuracy.Lowest
  ) => {
    try {
      setLocationState((prev) => ({ ...prev, isLoading: true, error: null }));

      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status === Location.PermissionStatus.GRANTED) {
        const location = await Location.getCurrentPositionAsync({
          accuracy,
        });

        setLocationState({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          hasPermission: true,
          isLoading: false,
          error: null,
        });
      } else {
        setLocationState((prev) => ({
          ...prev,
          hasPermission: false,
          isLoading: false,
          error: "Location permission denied",
        }));
      }
    } catch (error) {
      console.warn("Error requesting location permission:", error);
      setLocationState((prev) => ({
        ...prev,
        isLoading: false,
        error:
          error instanceof Error ? error.message : "Unknown location error",
      }));
    }
  };

  return {
    ...locationState,
    requestPermission,
  };
}
