import React, { useEffect } from "react";
import { Linking, Pressable, ScrollView, Text, View } from "react-native";

export default function WebLanding() {
  useEffect(() => {
    // Set the page title for web
    if (typeof document !== "undefined") {
      document.title = "Realite - Die App für echte Verbindungen";
    }
  }, []);

  const openAppStore = () => {
    Linking.openURL("https://apps.apple.com");
  };

  const openPlayStore = () => {
    Linking.openURL("https://play.google.com");
  };

  const scrollToSection = (sectionId: string) => {
    if (typeof document !== "undefined") {
      const element = document.getElementById(sectionId);
      element?.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <View className="flex-1 bg-white">
      <ScrollView className="flex-1">
        {/* Enhanced Header */}
        <View className="flex-row justify-between items-center px-8 py-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-100">
          <View className="flex-row items-center">
            <Text className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              Realite
            </Text>
            <Text className="ml-2 px-2 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full">
              BETA
            </Text>
          </View>

          <View className="flex-row items-center gap-6">
            <Pressable
              onPress={() => scrollToSection("features")}
              className="text-gray-600 hover:text-blue-600 transition-colors"
            >
              <Text className="font-medium">Features</Text>
            </Pressable>
            <Pressable
              onPress={() => scrollToSection("how-it-works")}
              className="text-gray-600 hover:text-blue-600 transition-colors"
            >
              <Text className="font-medium">So funktioniert&apos;s</Text>
            </Pressable>
            <Pressable
              onPress={() => scrollToSection("security")}
              className="text-gray-600 hover:text-blue-600 transition-colors"
            >
              <Text className="font-medium">Sicherheit</Text>
            </Pressable>
            <Pressable
              className="bg-gradient-to-r from-blue-500 to-indigo-600 px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all"
              onPress={() => scrollToSection("download")}
            >
              <Text className="text-white font-semibold">App laden</Text>
            </Pressable>
          </View>
        </View>

        {/* Hero Section with Gradient */}
        <View className="relative bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 px-8 py-20">
          <View className="max-w-6xl w-full mx-auto items-center">
            <View className="items-center mb-8">
              <Text className="text-6xl font-bold text-center bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent mb-6 leading-tight">
                Die App für echte{"\n"}Verbindungen
              </Text>
              <Text className="text-2xl font-medium text-center text-gray-600 mb-4 leading-relaxed">
                Leg dein Handy weg. Erlebe echte Momente.
              </Text>
              <Text className="text-lg text-center text-gray-500 max-w-2xl leading-relaxed">
                Realite ist deine App für echte Begegnungen statt endlosem
                Scrollen. Plane mühelos Aktivitäten mit Freunden oder finde neue
                Kontakte durch gemeinsame Interessen.
              </Text>
            </View>

            <View className="flex-row gap-4 mb-16 flex-wrap justify-center">
              <Pressable
                className="bg-gradient-to-r from-blue-500 to-blue-600 px-8 py-4 rounded-2xl shadow-lg hover:shadow-xl transition-all flex-row items-center"
                onPress={openAppStore}
              >
                <Text className="text-white font-semibold text-lg mr-2">
                  📱
                </Text>
                <Text className="text-white font-semibold text-lg">
                  App Store
                </Text>
              </Pressable>
              <Pressable
                className="bg-gradient-to-r from-emerald-500 to-emerald-600 px-8 py-4 rounded-2xl shadow-lg hover:shadow-xl transition-all flex-row items-center"
                onPress={openPlayStore}
              >
                <Text className="text-white font-semibold text-lg mr-2">
                  🤖
                </Text>
                <Text className="text-white font-semibold text-lg">
                  Google Play
                </Text>
              </Pressable>
            </View>
          </View>
        </View>

        {/* Activity Categories with Enhanced Design */}
        <View id="features" className="px-8 py-20 bg-white">
          <View className="max-w-6xl mx-auto">
            <Text className="text-4xl font-bold text-center text-gray-800 mb-4">
              Entdecke unendliche Möglichkeiten
            </Text>
            <Text className="text-xl text-center text-gray-600 mb-16 max-w-3xl mx-auto">
              Von Gaming bis Kultur, von Sport bis Musik – finde Menschen, die
              deine Leidenschaften teilen
            </Text>

            <View className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
              {[
                {
                  icon: "🎮",
                  title: "Gaming",
                  color: "from-red-400 to-red-500",
                },
                {
                  icon: "☕️",
                  title: "Kaffee",
                  color: "from-amber-400 to-orange-500",
                },
                {
                  icon: "🎨",
                  title: "Kunst",
                  color: "from-purple-400 to-pink-500",
                },
                {
                  icon: "⚽️",
                  title: "Sport",
                  color: "from-emerald-400 to-green-500",
                },
                {
                  icon: "🎲",
                  title: "Spiele",
                  color: "from-blue-400 to-indigo-500",
                },
                {
                  icon: "🎭",
                  title: "Kultur",
                  color: "from-pink-400 to-rose-500",
                },
                {
                  icon: "🏃‍♂️",
                  title: "Fitness",
                  color: "from-orange-400 to-red-500",
                },
                {
                  icon: "🍽️",
                  title: "Essen",
                  color: "from-lime-400 to-green-500",
                },
                {
                  icon: "🎵",
                  title: "Musik",
                  color: "from-cyan-400 to-blue-500",
                },
                {
                  icon: "🎯",
                  title: "Freizeit",
                  color: "from-indigo-400 to-purple-500",
                },
                {
                  icon: "🎸",
                  title: "Instrumente",
                  color: "from-violet-400 to-purple-500",
                },
                {
                  icon: "🏊‍♂️",
                  title: "Schwimmen",
                  color: "from-sky-400 to-cyan-500",
                },
              ].map((category, index) => (
                <Pressable key={index} className="group">
                  <View
                    className={`bg-gradient-to-br ${category.color} p-6 rounded-3xl items-center shadow-lg hover:shadow-xl transition-all group-hover:scale-105`}
                  >
                    <Text className="text-4xl mb-3">{category.icon}</Text>
                    <Text className="text-white font-semibold text-center text-sm">
                      {category.title}
                    </Text>
                  </View>
                </Pressable>
              ))}
            </View>
          </View>
        </View>

        {/* How it works with Visual Enhancement */}
        <View
          id="how-it-works"
          className="px-8 py-20 bg-gradient-to-br from-gray-50 to-blue-50"
        >
          <View className="max-w-6xl mx-auto">
            <Text className="text-4xl font-bold text-center text-gray-800 mb-4">
              Einfach & Effizient
            </Text>
            <Text className="text-xl text-center text-gray-600 mb-16">
              So funktioniert&apos;s – in nur drei einfachen Schritten zu echten
              Verbindungen
            </Text>

            <View className="grid md:grid-cols-3 gap-8">
              <View className="bg-white p-8 rounded-3xl shadow-xl hover:shadow-2xl transition-all">
                <View className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl items-center justify-center mb-6">
                  <Text className="text-white text-2xl font-bold">1</Text>
                </View>
                <Text className="text-2xl font-bold text-gray-800 mb-4">
                  Aktivität vorschlagen
                </Text>
                <Text className="text-gray-600 leading-relaxed mb-6">
                  Erstelle einen Vorschlag für eine Aktivität. Wähle aus
                  beliebten Spots oder schlage neue vor. Die App hilft dir beim
                  Finden der perfekten Zeit und Location.
                </Text>
                <View className="bg-blue-50 p-4 rounded-xl">
                  <Text className="text-blue-700 font-medium text-sm">
                    💡 Tipp: Max. 3 aktive Vorschläge gleichzeitig
                  </Text>
                </View>
              </View>

              <View className="bg-white p-8 rounded-3xl shadow-xl hover:shadow-2xl transition-all">
                <View className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-green-600 rounded-2xl items-center justify-center mb-6">
                  <Text className="text-white text-2xl font-bold">2</Text>
                </View>
                <Text className="text-2xl font-bold text-gray-800 mb-4">
                  Rückmeldungen erhalten
                </Text>
                <Text className="text-gray-600 leading-relaxed mb-6">
                  Deine Kontakte und ausgewählte Kreise sehen den Vorschlag und
                  können ihre Verfügbarkeit angeben. Die Zuverlässigkeit der
                  Teilnehmer wird transparent angezeigt.
                </Text>
                <View className="bg-emerald-50 p-4 rounded-xl">
                  <Text className="text-emerald-700 font-medium text-sm">
                    ⭐ Zuverlässigkeits-Score hilft bei der Planung
                  </Text>
                </View>
              </View>

              <View className="bg-white p-8 rounded-3xl shadow-xl hover:shadow-2xl transition-all">
                <View className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl items-center justify-center mb-6">
                  <Text className="text-white text-2xl font-bold">3</Text>
                </View>
                <Text className="text-2xl font-bold text-gray-800 mb-4">
                  Termin bestätigen
                </Text>
                <Text className="text-gray-600 leading-relaxed mb-6">
                  Bestätige den finalen Termin. Nach dem Treffen könnt ihr
                  gegenseitig eure Teilnahme bestätigen, was eure
                  Zuverlässigkeitswerte verbessert.
                </Text>
                <View className="bg-purple-50 p-4 rounded-xl">
                  <Text className="text-purple-700 font-medium text-sm">
                    🎉 Teile deine Erlebnisse mit der Community
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Security Section with Enhanced Visual Design */}
        <View id="security" className="px-8 py-20 bg-white">
          <View className="max-w-6xl mx-auto">
            <Text className="text-4xl font-bold text-center text-gray-800 mb-4">
              Sicherheit & Vertrauen
            </Text>
            <Text className="text-xl text-center text-gray-600 mb-16 max-w-3xl mx-auto">
              Realite setzt auf ein einzigartiges Sicherheitskonzept, das echte
              Verbindungen fördert und Fake-Profile verhindert.
            </Text>

            <View className="grid md:grid-cols-3 gap-8">
              <View className="text-center group">
                <View className="w-24 h-24 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-3xl items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
                  <Text className="text-4xl">🔒</Text>
                </View>
                <Text className="text-2xl font-bold text-gray-800 mb-4">
                  Invite-only Zugang
                </Text>
                <Text className="text-gray-600 leading-relaxed">
                  Neue Nutzer können nur über persönliche Einladungen beitreten.
                  Dein Kontaktbuch hilft dabei zu bestätigen, dass die Person
                  ist, wer sie vorgibt zu sein.
                </Text>
              </View>

              <View className="text-center group">
                <View className="w-24 h-24 bg-gradient-to-br from-emerald-500 to-green-600 rounded-3xl items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
                  <Text className="text-4xl">👥</Text>
                </View>
                <Text className="text-2xl font-bold text-gray-800 mb-4">
                  Kreise & Gruppen
                </Text>
                <Text className="text-gray-600 leading-relaxed">
                  Aktivitäten können auf bestimmte Kreise beschränkt werden. So
                  bleiben private Treffen privat und öffentliche Aktivitäten
                  erreichen die richtigen Leute.
                </Text>
              </View>

              <View className="text-center group">
                <View className="w-24 h-24 bg-gradient-to-br from-purple-500 to-pink-600 rounded-3xl items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
                  <Text className="text-4xl">⭐</Text>
                </View>
                <Text className="text-2xl font-bold text-gray-800 mb-4">
                  Zuverlässigkeits-Score
                </Text>
                <Text className="text-gray-600 leading-relaxed">
                  Nach jedem Treffen bestätigen sich die Teilnehmer gegenseitig.
                  Das schafft Vertrauen und hilft dabei, zuverlässige Kontakte
                  zu finden.
                </Text>
              </View>
            </View>

            <View className="mt-16 bg-gradient-to-r from-blue-50 to-indigo-50 p-8 rounded-3xl border border-blue-100">
              <View className="flex-row items-center justify-center mb-4">
                <Text className="text-3xl mr-3">🔒</Text>
                <Text className="text-xl font-bold text-gray-800">
                  Deine Sicherheit hat höchste Priorität
                </Text>
              </View>
              <Text className="text-center text-gray-600 leading-relaxed">
                Mit unserem dreistufigen Sicherheitskonzept kannst du dich voll
                und ganz auf das Kennenlernen neuer Menschen konzentrieren.
              </Text>
            </View>
          </View>
        </View>

        {/* Enhanced CTA Section */}
        <View
          id="download"
          className="px-8 py-20 bg-gradient-to-br from-gray-800 via-gray-900 to-black"
        >
          <View className="max-w-4xl mx-auto text-center">
            <Text className="text-5xl font-bold text-white mb-6 leading-tight">
              Bereit für echte{"\n"}Begegnungen?
            </Text>
            <Text className="text-xl text-gray-300 mb-12 leading-relaxed max-w-2xl mx-auto">
              Sei von Anfang an dabei! Lade die App herunter und starte noch
              heute mit deinen Aktivitäten. Wir freuen uns darauf, dich
              kennenzulernen!
            </Text>

            <View className="flex-row justify-center gap-6 mb-12 flex-wrap">
              <Pressable
                className="bg-gradient-to-r from-blue-500 to-blue-600 px-10 py-5 rounded-2xl shadow-2xl hover:shadow-blue-500/25 transition-all hover:scale-105"
                onPress={openAppStore}
              >
                <Text className="text-white font-bold text-xl">
                  📱 App Store
                </Text>
              </Pressable>
              <Pressable
                className="bg-gradient-to-r from-emerald-500 to-emerald-600 px-10 py-5 rounded-2xl shadow-2xl hover:shadow-emerald-500/25 transition-all hover:scale-105"
                onPress={openPlayStore}
              >
                <Text className="text-white font-bold text-xl">
                  🤖 Google Play
                </Text>
              </Pressable>
            </View>

            <View className="flex-row justify-center items-center gap-4">
              <Text className="text-gray-400">oder folge uns für Updates:</Text>
              <Pressable
                onPress={() =>
                  Linking.openURL("https://instagram.com/realite.app")
                }
                className="flex-row items-center bg-gradient-to-r from-pink-500 to-rose-500 px-4 py-2 rounded-xl"
              >
                <Text className="text-white font-semibold">📸 Instagram</Text>
              </Pressable>
            </View>
          </View>
        </View>

        {/* Enhanced Footer */}
        <View className="px-8 py-12 bg-gray-50 border-t border-gray-200">
          <View className="max-w-6xl mx-auto w-full">
            <View className="flex-row justify-between items-center mb-8">
              <View>
                <Text className="text-2xl font-bold text-gray-800 mb-2">
                  Realite
                </Text>
                <Text className="text-gray-600">
                  Die App für echte Verbindungen
                </Text>
              </View>
              <View className="flex-row gap-6">
                <Pressable>
                  <Text className="text-gray-600 hover:text-blue-600 transition-colors">
                    Impressum
                  </Text>
                </Pressable>
                <Pressable>
                  <Text className="text-gray-600 hover:text-blue-600 transition-colors">
                    Datenschutz
                  </Text>
                </Pressable>
                <Pressable>
                  <Text className="text-gray-600 hover:text-blue-600 transition-colors">
                    AGB
                  </Text>
                </Pressable>
              </View>
            </View>
            <View className="border-t border-gray-200 pt-8 text-center">
              <Text className="text-gray-500 mb-2">© 2025 Realite</Text>
              <Text className="text-gray-400">Entwickelt von CLYE GmbH</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
