import { useEffect, useState } from "react";
import * as SecureStore from "expo-secure-store";

const RADIUS_STORAGE_KEY = "location_search_radius";
const DEFAULT_RADIUS_KM = 50; // 50km Standard

export function useLocationRadius() {
  const [radiusKm, setRadiusKm] = useState<number>(DEFAULT_RADIUS_KM);
  const [isLoading, setIsLoading] = useState(true);

  // Lade gespeicherten Radius beim Start
  useEffect(() => {
    const loadRadius = async () => {
      try {
        const storedRadius = await SecureStore.getItemAsync(RADIUS_STORAGE_KEY);
        if (storedRadius) {
          const parsedRadius = parseInt(storedRadius, 10);
          if (
            !isNaN(parsedRadius) &&
            parsedRadius > 0 &&
            parsedRadius <= 20000
          ) {
            setRadiusKm(parsedRadius);
          }
        }
      } catch (error) {
        console.warn("Error loading radius from storage:", error);
      } finally {
        setIsLoading(false);
      }
    };

    void loadRadius();
  }, []);

  // Speichere Radius bei Änderung
  const updateRadius = async (newRadiusKm: number) => {
    if (newRadiusKm <= 0 || newRadiusKm > 50000) {
      console.warn("Invalid radius value:", newRadiusKm);
      return;
    }

    setRadiusKm(newRadiusKm);

    try {
      await SecureStore.setItemAsync(
        RADIUS_STORAGE_KEY,
        newRadiusKm.toString(),
      );
    } catch (error) {
      console.warn("Error saving radius to storage:", error);
    }
  };

  // Konvertiere km zu Metern für die API
  const radiusMeters = radiusKm * 1000;

  return {
    radiusKm,
    radiusMeters,
    updateRadius,
    isLoading,
  };
}
