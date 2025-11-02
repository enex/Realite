import {
  Keyboard,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";

import { orpc } from "@/client/orpc";
import { useQuery } from "@tanstack/react-query";
import React, { useEffect, useRef, useState } from "react";
import tinycolor from "tinycolor2";

function LocationEditBottomSheet({
  currentLocation,
  accentColor,
  userLat,
  userLon,
  onClose,
  onSelect,
}: {
  currentLocation?: {
    title?: string;
    address?: string;
    latitude?: number;
    longitude?: number;
  };
  accentColor: string;
  userLat?: number;
  userLon?: number;
  onClose: () => void;
  onSelect: (location: {
    title: string;
    address?: string;
    latitude: number;
    longitude: number;
  }) => void;
}) {
  const [locationQuery, setLocationQuery] = useState(
    currentLocation?.title || currentLocation?.address || ""
  );
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const textInputRef = useRef<TextInput>(null);
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    // Clear initial value so user can search fresh
    setLocationQuery("");
    setDebouncedQuery("");
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(locationQuery.trim()), 250);
    return () => clearTimeout(t);
  }, [locationQuery]);

  useEffect(() => {
    const keyboardWillShow = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
      (e) => {
        setKeyboardHeight(e.endCoordinates.height);
        // Scroll to input when keyboard appears
        setTimeout(() => {
          scrollViewRef.current?.scrollTo({ y: 0, animated: true });
          textInputRef.current?.focus();
        }, 100);
      }
    );
    const keyboardWillHide = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
      () => {
        setKeyboardHeight(0);
      }
    );

    return () => {
      keyboardWillShow.remove();
      keyboardWillHide.remove();
    };
  }, []);

  useEffect(() => {
    // Auto focus when component mounts
    setTimeout(() => {
      textInputRef.current?.focus();
    }, 300);
  }, []);

  const shouldSearch = debouncedQuery.trim().length >= 2;
  const {
    data: locationSearch,
    isLoading: isSearching,
    error,
  } = useQuery({
    ...orpc.location.search.queryOptions({
      input: {
        query: debouncedQuery.trim(),
        includePhotos: true,
        limit: 10,
        userLocation:
          userLat && userLon ? { lat: userLat, lng: userLon } : undefined,
      },
    }),
    enabled: shouldSearch,
  });

  useEffect(() => {
    if (shouldSearch) {
      console.log("🔍 Location search:", {
        query: debouncedQuery.trim(),
        isSearching,
        hasData: !!locationSearch,
        locationsCount: locationSearch?.locations?.length ?? 0,
        error: error ? String(error) : null,
        rawData: locationSearch,
      });
    } else {
      console.log("⏸️ Search disabled:", {
        query: debouncedQuery.trim(),
        queryLength: debouncedQuery.trim().length,
        shouldSearch,
      });
    }
  }, [debouncedQuery, isSearching, locationSearch, error, shouldSearch]);

  const chipBackground = tinycolor(accentColor).setAlpha(0.08).toRgbString();
  const chipBorder = tinycolor(accentColor).setAlpha(0.18).toRgbString();
  const primaryText = tinycolor(accentColor).darken(12).toHexString();
  const mutedText = tinycolor(accentColor)
    .darken(24)
    .setAlpha(0.75)
    .toRgbString();

  return (
    <View
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 0,
        top: 0,
        backgroundColor: "rgba(0,0,0,0.2)",
        justifyContent: "flex-end",
      }}
    >
      <Pressable style={{ flex: 1 }} onPress={onClose} />
      <View
        style={{
          backgroundColor: "#fff",
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          flex: 1,
          maxHeight: "100%",
          marginTop: 60,
          marginBottom:
            keyboardHeight > 0 && Platform.OS === "android"
              ? keyboardHeight
              : 0,
        }}
      >
        <View
          style={{
            height: 4,
            width: 44,
            backgroundColor: "#D1D1D6",
            borderRadius: 2,
            alignSelf: "center",
            marginTop: 8,
            marginBottom: 12,
          }}
        />
        {/* Fixed header with title and input */}
        <View
          style={{
            paddingHorizontal: 16,
            paddingBottom: 12,
            borderBottomWidth: 1,
            borderBottomColor: "#E5E7EB",
          }}
        >
          <Text
            style={{
              fontSize: 22,
              fontWeight: "700" as const,
              lineHeight: 28,
              color: "#0F172A",
              marginBottom: 12,
            }}
          >
            Ort bearbeiten
          </Text>
          <TextInput
            ref={textInputRef}
            style={{
              backgroundColor: "#F9FAFB",
              borderRadius: 12,
              borderWidth: 1,
              borderColor: "#E5E7EB",
              paddingHorizontal: 16,
              paddingVertical: 12,
              fontSize: 17,
              color: "#0F172A",
            }}
            placeholder="Ort suchen (mind. 2 Zeichen)"
            placeholderTextColor="#9CA3AF"
            value={locationQuery}
            onChangeText={setLocationQuery}
            autoCorrect={false}
            autoCapitalize="none"
            returnKeyType="search"
          />
        </View>
        {/* Scrollable results */}
        {debouncedQuery.trim().length >= 2 ? (
          <ScrollView
            ref={scrollViewRef}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={true}
            style={{ flex: 1 }}
            contentContainerStyle={{
              paddingHorizontal: 16,
              paddingTop: 12,
              paddingBottom: 16,
            }}
            nestedScrollEnabled={true}
          >
            <View style={{ gap: 8 }}>
              {(() => {
                console.log("🎨 Rendering state:", {
                  isSearching,
                  hasError: !!error,
                  hasLocations: !!locationSearch?.locations,
                  locationsLength: locationSearch?.locations?.length ?? 0,
                });
                return null;
              })()}
              {isSearching ? (
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: "400" as const,
                    lineHeight: 16,
                    color: mutedText,
                    textAlign: "center",
                    paddingVertical: 16,
                  }}
                >
                  Suche...
                </Text>
              ) : error ? (
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: "400" as const,
                    lineHeight: 16,
                    color: "#EF4444",
                    textAlign: "center",
                    paddingVertical: 16,
                  }}
                >
                  Fehler beim Suchen: {String(error)}
                </Text>
              ) : locationSearch?.locations &&
                Array.isArray(locationSearch.locations) &&
                locationSearch.locations.length > 0 ? (
                locationSearch.locations.map((l) => (
                  <Pressable
                    key={l.id}
                    onPress={() => {
                      onSelect({
                        title: l.name,
                        address: l.address ?? undefined,
                        latitude: l.latitude,
                        longitude: l.longitude,
                      });
                    }}
                    style={{
                      backgroundColor: chipBackground,
                      borderRadius: 14,
                      borderWidth: 1,
                      borderColor: chipBorder,
                      paddingHorizontal: 16,
                      paddingVertical: 8,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 15,
                        lineHeight: 20,
                        color: primaryText,
                        fontWeight: "600",
                      }}
                    >
                      {l.name}
                    </Text>
                    {l.address && (
                      <Text
                        style={{
                          fontSize: 12,
                          fontWeight: "400" as const,
                          lineHeight: 16,
                          color: mutedText,
                          marginTop: 2,
                        }}
                      >
                        {l.address}
                      </Text>
                    )}
                  </Pressable>
                ))
              ) : (
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: "400" as const,
                    lineHeight: 16,
                    color: mutedText,
                    textAlign: "center",
                    paddingVertical: 16,
                  }}
                >
                  Keine Ergebnisse gefunden
                </Text>
              )}
            </View>
          </ScrollView>
        ) : (
          <View
            style={{
              paddingHorizontal: 16,
              paddingVertical: 16,
              flex: 1,
              justifyContent: "center",
            }}
          >
            <Text
              style={{
                fontSize: 12,
                fontWeight: "400" as const,
                lineHeight: 16,
                color: mutedText,
                textAlign: "center",
              }}
            >
              Gib mindestens 2 Zeichen ein, um Orte zu suchen
            </Text>
          </View>
        )}
        {/* Fixed cancel button at bottom */}
        <View
          style={{
            paddingHorizontal: 16,
            paddingTop: 8,
            paddingBottom: 24,
            borderTopWidth: 1,
            borderTopColor: "#E5E7EB",
          }}
        >
          <Pressable
            onPress={onClose}
            style={{
              backgroundColor: "#E5E5EA",
              borderRadius: 12,
              paddingVertical: 12,
              alignItems: "center",
            }}
          >
            <Text
              style={{
                fontSize: 15,
                fontWeight: "400" as const,
                lineHeight: 20,
                color: "#1C1C1E",
              }}
            >
              Abbrechen
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

export default React.memo(LocationEditBottomSheet);
