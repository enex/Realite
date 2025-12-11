import { useSession } from "@/client/auth";
import orpc from "@/client/orpc";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import React, { useEffect } from "react";
import { Linking, Pressable, ScrollView, Text, View } from "react-native";

export default function WebLanding() {
  const { session, isLoading } = useSession();
  const meRes = useQuery(orpc.auth.me.queryOptions());
  useEffect(() => {
    if (isLoading || !meRes.data) return;
    if (meRes.data.onboarded) {
      router.replace("/(tabs)");
    } else {
      router.replace("/onboarding/welcome");
    }
  }, [session, isLoading, meRes.data, meRes.isLoading]);
  useEffect(() => {
    // Set the page title for web
    if (typeof document !== "undefined") {
      document.title =
        "Realite – Die App für echte Verbindungen | Leg dein Handy weg. Erlebe echte Momente.";
    }
  }, []);

  const openWhatsAppChannel = () => {
    Linking.openURL("https://whatsapp.com/channel/0029Vb5w20yKwqSOem15d11O");
  };

  const scrollToSection = (sectionId: string) => {
    if (typeof document !== "undefined") {
      const element = document.getElementById(sectionId);
      element?.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <View className="flex-1 bg-[#F5F5F7] dark:bg-black">
      <ScrollView className="flex-1">
        {/* Apple-like Glass Header */}
        <View className="flex-row justify-between items-center px-6 md:px-10 py-4 bg-white/60 dark:bg-black/40 backdrop-blur-xl border-b border-white/30 dark:border-white/10 sticky top-0 z-50">
          <View className="flex-row items-center">
            <View className="w-9 h-9 mr-3 rounded-xl overflow-hidden shadow-md">
              <img
                src={require("../assets/images/icon.png").uri}
                alt="Realite App Icon"
                className="w-full h-full scale-110 object-cover rounded-xl"
              />
            </View>
            <Text className="text-xl md:text-2xl font-semibold text-gray-900 dark:text-white tracking-tight">
              Realite
            </Text>
            <Text className="ml-3 px-2.5 py-1 bg-white/70 dark:bg-white/10 text-gray-700 dark:text-white/80 text-[11px] font-semibold rounded-full border border-white/60 dark:border-white/20 backdrop-blur-md">
              CLOSED BETA
            </Text>
          </View>

          <View className="flex-row items-center gap-6 md:gap-8">
            <Pressable onPress={() => scrollToSection("features")}>
              <Text className="text-gray-700 dark:text-white/80 hover:text-black dark:hover:text-white transition-colors font-medium">
                Features
              </Text>
            </Pressable>
            <Pressable onPress={() => scrollToSection("how-it-works")}>
              <Text className="text-gray-700 dark:text-white/80 hover:text-black dark:hover:text-white transition-colors font-medium">
                So funktioniert&apos;s
              </Text>
            </Pressable>
            <Pressable onPress={() => scrollToSection("security")}>
              <Text className="text-gray-700 dark:text-white/80 hover:text-black dark:hover:text-white transition-colors font-medium">
                Sicherheit
              </Text>
            </Pressable>
            <Pressable
              className="bg-black/90 dark:bg-white/90 px-5 py-2.5 rounded-full shadow-lg hover:shadow-xl transition-all"
              onPress={openWhatsAppChannel}
            >
              <Text className="text-white dark:text-black font-semibold tracking-tight">
                Updates erhalten
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Hero Section with subtle glass + color blobs */}
        <View className="relative px-6 md:px-10 py-24 md:py-32 overflow-hidden">
          <View pointerEvents="none" className="absolute inset-0">
            <View className="absolute -top-24 -left-20 w-[420px] h-[420px] bg-emerald-300/40 dark:bg-emerald-500/25 rounded-full blur-3xl" />
            <View className="absolute top-0 right-0 w-[520px] h-[520px] bg-sky-300/35 dark:bg-sky-500/20 rounded-full blur-3xl" />
            <View className="absolute bottom-[-180px] left-1/3 w-[560px] h-[560px] bg-fuchsia-300/35 dark:bg-fuchsia-500/20 rounded-full blur-3xl" />
          </View>

          <View className="max-w-6xl w-full mx-auto flex-col lg:flex-row items-center gap-12 lg:gap-16">
            {/* Copy */}
            <View className="flex-1">
              <Text className="text-[52px] md:text-[64px] font-semibold text-gray-900 dark:text-white leading-[1.05] tracking-tight">
                Die App für echte{"\n"}Verbindungen
              </Text>
              <Text className="text-xl md:text-2xl font-medium text-gray-700 dark:text-white/80 mt-5 leading-relaxed">
                Leg dein Handy weg. Erlebe echte Momente.
              </Text>
              <Text className="text-base md:text-lg text-gray-600 dark:text-white/70 mt-4 leading-relaxed max-w-xl">
                Realite bringt Menschen im echten Leben zusammen. Erstelle Pläne
                in Sekunden, finde Aktivitäten in deiner Nähe und triff Leute,
                die deine Interessen teilen – ohne endloses Scrollen.
              </Text>

              <View className="mt-8 flex-row items-center flex-wrap gap-4">
                <Pressable
                  className="bg-black/90 dark:bg-white/90 px-7 py-4 rounded-full shadow-2xl"
                  onPress={openWhatsAppChannel}
                >
                  <Text className="text-white dark:text-black font-semibold text-base md:text-lg tracking-tight">
                    WhatsApp‑Kanal abonnieren
                  </Text>
                </Pressable>
                <View className="px-4 py-2 rounded-full bg-white/70 dark:bg-white/10 border border-white/60 dark:border-white/20 backdrop-blur-md">
                  <Text className="text-sm text-gray-700 dark:text-white/80 font-medium">
                    Geschlossene Beta • Apps bald verfügbar
                  </Text>
                </View>
              </View>

              <View className="mt-10 flex-row gap-6">
                {[
                  { icon: "🤝", label: "Echte Menschen" },
                  { icon: "🎯", label: "Gemeinsame Interessen" },
                  { icon: "🔒", label: "Invite‑only & sicher" },
                ].map((f) => (
                  <View key={f.label} className="items-center">
                    <View className="w-12 h-12 bg-white/70 dark:bg-white/10 rounded-2xl items-center justify-center border border-white/60 dark:border-white/20 backdrop-blur-md shadow-sm">
                      <Text className="text-xl">{f.icon}</Text>
                    </View>
                    <Text className="mt-2 text-sm text-gray-700 dark:text-white/80 font-medium">
                      {f.label}
                    </Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Glass mockup */}
            <View className="flex-1 w-full max-w-md">
              <View className="rounded-[44px] bg-white/70 dark:bg-white/10 border border-white/70 dark:border-white/20 backdrop-blur-2xl shadow-2xl p-6">
                <View className="items-center mb-4">
                  <View className="w-10 h-1.5 rounded-full bg-black/10 dark:bg-white/15" />
                </View>
                <Text className="text-sm text-gray-500 dark:text-white/60 font-semibold tracking-widest uppercase mb-3">
                  Heute
                </Text>
                <View className="gap-3">
                  {[
                    {
                      title: "Coffee Run",
                      meta: "10:00 · Café‑Bar Human",
                    },
                    {
                      title: "Spaziergang im Park",
                      meta: "18:30 · Schönbusch",
                    },
                    {
                      title: "Boardgame Night",
                      meta: "20:00 · Bei dir zuhause",
                    },
                  ].map((p) => (
                    <View
                      key={p.title}
                      className="rounded-3xl bg-white/80 dark:bg-white/10 border border-white/70 dark:border-white/20 backdrop-blur-md px-4 py-3 shadow-sm"
                    >
                      <Text className="text-base font-semibold text-gray-900 dark:text-white">
                        {p.title}
                      </Text>
                      <Text className="text-sm text-gray-600 dark:text-white/70 mt-1">
                        {p.meta}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Mission & Vision */}
        <View className="px-6 md:px-10 py-14">
          <View className="max-w-4xl mx-auto">
            <View className="bg-white/70 dark:bg-white/10 border border-white/70 dark:border-white/20 backdrop-blur-xl rounded-3xl p-8 md:p-10 shadow-xl">
              <Text className="text-3xl font-semibold text-gray-900 dark:text-white mb-3 tracking-tight text-center">
                Unsere Mission
              </Text>
              <Text className="text-base md:text-lg text-gray-700 dark:text-white/80 leading-relaxed text-center">
                Menschen im echten Leben verbinden – ob Freunde, Bekannte oder
                noch Unbekannte. Realite ist die Gegenbewegung zu ständig online
                sein. Wir machen reale Treffen so einfach wie eine Nachricht zu
                schreiben.
              </Text>
            </View>
          </View>
        </View>

        {/* Modern Activity Categories */}
        <View
          id="features"
          className="px-6 md:px-10 py-24 bg-transparent"
        >
          <View className="max-w-7xl mx-auto">
            <View className="text-center mb-20">
              <Text className="text-5xl font-semibold text-gray-900 dark:text-white mb-6 leading-tight tracking-tight">
                Entdecke unendliche{"\n"}Möglichkeiten
              </Text>
              <Text className="text-xl md:text-2xl text-gray-700 dark:text-white/80 max-w-4xl mx-auto leading-relaxed">
                Von Gaming bis Kultur, von Sport bis Musik – finde Menschen, die
                deine Leidenschaften teilen
              </Text>
            </View>

            <View className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-8">
              {[
                {
                  icon: "🎮",
                  title: "Gaming",
                  color: "from-red-500 to-pink-600",
                  bg: "bg-red-50",
                },
                {
                  icon: "☕️",
                  title: "Kaffee",
                  color: "from-amber-500 to-orange-600",
                  bg: "bg-amber-50",
                },
                {
                  icon: "🎨",
                  title: "Kunst",
                  color: "from-purple-500 to-pink-600",
                  bg: "bg-purple-50",
                },
                {
                  icon: "⚽️",
                  title: "Sport",
                  color: "from-emerald-500 to-green-600",
                  bg: "bg-emerald-50",
                },
                {
                  icon: "🎲",
                  title: "Spiele",
                  color: "from-pink-500 to-rose-600",
                  bg: "bg-pink-50",
                },
                {
                  icon: "🎭",
                  title: "Kultur",
                  color: "from-pink-500 to-rose-600",
                  bg: "bg-pink-50",
                },
                {
                  icon: "🏃‍♂️",
                  title: "Fitness",
                  color: "from-orange-500 to-red-600",
                  bg: "bg-orange-50",
                },
                {
                  icon: "🍽️",
                  title: "Essen",
                  color: "from-lime-500 to-green-600",
                  bg: "bg-lime-50",
                },
                {
                  icon: "🎵",
                  title: "Musik",
                  color: "from-cyan-500 to-pink-600",
                  bg: "bg-cyan-50",
                },
                {
                  icon: "🎯",
                  title: "Freizeit",
                  color: "from-indigo-500 to-purple-600",
                  bg: "bg-indigo-50",
                },
                {
                  icon: "🎸",
                  title: "Instrumente",
                  color: "from-violet-500 to-purple-600",
                  bg: "bg-violet-50",
                },
                {
                  icon: "🏊‍♂️",
                  title: "Schwimmen",
                  color: "from-sky-500 to-cyan-600",
                  bg: "bg-sky-50",
                },
              ].map((category, index) => (
                <Pressable
                  key={index}
                  className="group transition-all duration-300 hover:shadow-2xl"
                >
                  <View
                    className="p-7 rounded-3xl items-center bg-white/70 dark:bg-white/10 border border-white/70 dark:border-white/20 backdrop-blur-xl shadow-lg hover:shadow-2xl transition-all"
                  >
                    <View
                      className={`w-16 h-16 bg-gradient-to-br ${category.color} rounded-2xl items-center justify-center shadow-lg mb-4`}
                    >
                      <Text className="text-3xl">{category.icon}</Text>
                    </View>
                    <Text className="text-gray-900 dark:text-white font-semibold text-center text-base tracking-tight">
                      {category.title}
                    </Text>
                  </View>
                </Pressable>
              ))}
            </View>
          </View>
        </View>

        {/* Enhanced How it works */}
        <View id="how-it-works" className="px-6 md:px-10 py-24 bg-transparent">
          <View className="max-w-7xl mx-auto">
            <View className="text-center mb-20">
              <Text className="text-5xl font-semibold text-gray-900 dark:text-white mb-6 leading-tight tracking-tight">
                Einfach & Effizient
              </Text>
              <Text className="text-xl md:text-2xl text-gray-700 dark:text-white/80 mb-4">
                So funktioniert&apos;s – in nur drei einfachen Schritten zu
                echten Verbindungen
              </Text>
              <View className="w-24 h-1 bg-gradient-to-r from-pink-500 to-rose-600 mx-auto rounded-full"></View>
            </View>

            <View className="grid lg:grid-cols-3 gap-12 relative">
              {/* Connection Lines */}
              <View className="absolute top-24 left-1/4 right-1/4 h-0.5 bg-gradient-to-r from-pink-200 via-emerald-200 to-purple-200 hidden lg:block"></View>

              {[
                {
                  step: "1",
                  title: "Aktivität vorschlagen",
                  description:
                    "Erstelle einen Vorschlag für eine Aktivität. Wähle aus beliebten Spots oder schlage neue vor. Die App hilft dir beim Finden der perfekten Zeit und Location.",
                  tip: "💡 Trage alles ein, was du vorhast – und Orte, an denen du andere treffen möchtest",
                  color: "from-pink-500 to-rose-600",
                  bgColor: "bg-pink-50",
                  tipColor: "text-blue-700",
                },
                {
                  step: "2",
                  title: "Rückmeldungen erhalten",
                  description:
                    "Deine Kontakte und ausgewählte Kreise sehen den Vorschlag und können ihre Verfügbarkeit angeben. Die Zuverlässigkeit der Teilnehmer wird transparent angezeigt.",
                  tip: "⭐ Zuverlässigkeits-Score hilft bei der Planung",
                  color: "from-emerald-500 to-green-600",
                  bgColor: "bg-emerald-50",
                  tipColor: "text-emerald-700",
                },
                {
                  step: "3",
                  title: "Termin bestätigen",
                  description:
                    "Bestätige den finalen Termin. Nach dem Treffen könnt ihr gegenseitig eure Teilnahme bestätigen, was eure Zuverlässigkeitswerte verbessert.",
                  tip: "🎉 Teile deine Erlebnisse mit der Community",
                  color: "from-purple-500 to-pink-600",
                  bgColor: "bg-purple-50",
                  tipColor: "text-purple-700",
                },
              ].map((item, index) => (
                <View key={index} className="relative">
                  <View className="bg-white/70 dark:bg-white/10 p-10 rounded-3xl shadow-xl hover:shadow-2xl transition-all duration-500 border border-white/70 dark:border-white/20 backdrop-blur-xl">
                    <View className="relative mb-8">
                      <View
                        className={`w-20 h-20 bg-gradient-to-br ${item.color} rounded-3xl items-center justify-center shadow-xl mx-auto`}
                      >
                        <Text className="text-white text-3xl font-black">
                          {item.step}
                        </Text>
                      </View>
                      {/* Step connector dot */}
                      <View className="absolute -top-2 -right-2 w-6 h-6 bg-white/80 dark:bg-white/10 rounded-full shadow-md border border-white/70 dark:border-white/20 hidden lg:block backdrop-blur-md"></View>
                    </View>

                    <Text className="text-2xl font-semibold text-gray-900 dark:text-white mb-6 text-center tracking-tight">
                      {item.title}
                    </Text>

                    <Text className="text-gray-700 dark:text-white/80 leading-relaxed mb-8 text-lg">
                      {item.description}
                    </Text>

                    <View
                      className="bg-white/80 dark:bg-white/10 p-6 rounded-2xl border border-white/70 dark:border-white/20 backdrop-blur-md"
                    >
                      <Text
                        className="text-gray-900 dark:text-white font-medium text-base"
                      >
                        {item.tip}
                      </Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* Modern Security Section */}
        <View id="security" className="px-6 md:px-10 py-24 bg-transparent">
          <View className="max-w-7xl mx-auto">
            <View className="text-center mb-20">
              <Text className="text-sm font-semibold text-gray-700 dark:text-white/80 bg-white/70 dark:bg-white/10 px-4 py-2 rounded-full mb-6 self-center border border-white/70 dark:border-white/20 backdrop-blur-md">
                Sicherheit & Vertrauen
              </Text>
              <Text className="text-5xl font-semibold text-gray-900 dark:text-white mb-6 leading-tight tracking-tight">
                Sicher & Vertrauenswürdig
              </Text>
              <Text className="text-xl md:text-2xl text-gray-700 dark:text-white/80 max-w-4xl mx-auto leading-relaxed">
                Realite setzt auf ein einzigartiges Sicherheitskonzept, das
                echte Verbindungen fördert und Fake-Profile verhindert.
              </Text>
            </View>

            <View className="grid lg:grid-cols-3 gap-10 mb-16">
              {[
                {
                  icon: "🔒",
                  title: "Invite-only Zugang",
                  description:
                    "Neue Nutzer können nur über persönliche Einladungen beitreten. Dein Kontaktbuch hilft dabei zu bestätigen, dass die Person ist, wer sie vorgibt zu sein.",
                  color: "from-blue-500 to-indigo-600",
                  bgColor: "bg-blue-50/50",
                },
                {
                  icon: "👥",
                  title: "Kreise & Gruppen",
                  description:
                    "Aktivitäten können auf bestimmte Kreise beschränkt werden. So bleiben private Treffen privat und öffentliche Aktivitäten erreichen die richtigen Leute.",
                  color: "from-emerald-500 to-green-600",
                  bgColor: "bg-emerald-50/50",
                },
                {
                  icon: "⭐",
                  title: "Zuverlässigkeits-Score",
                  description:
                    "Nach jedem Treffen bestätigen sich die Teilnehmer gegenseitig. Das schafft Vertrauen und hilft dabei, zuverlässige Kontakte zu finden.",
                  color: "from-purple-500 to-pink-600",
                  bgColor: "bg-purple-50/50",
                },
              ].map((item, index) => (
                <View key={index} className="group">
                  <View className="bg-white/70 dark:bg-white/10 backdrop-blur-xl p-10 rounded-3xl shadow-xl hover:shadow-2xl transition-all duration-500 border border-white/70 dark:border-white/20">
                    <View
                      className={`w-20 h-20 bg-gradient-to-br ${item.color} rounded-3xl items-center justify-center mx-auto mb-8 shadow-xl transition-all duration-300`}
                    >
                      <Text className="text-4xl">{item.icon}</Text>
                    </View>
                    <Text className="text-2xl font-semibold text-gray-900 dark:text-white mb-6 text-center tracking-tight">
                      {item.title}
                    </Text>
                    <Text className="text-gray-700 dark:text-white/80 leading-relaxed text-lg text-center">
                      {item.description}
                    </Text>
                  </View>
                </View>
              ))}
            </View>

            {/* Security Promise Banner */}
            <View className="bg-white/70 dark:bg-white/10 p-12 rounded-3xl shadow-2xl text-center border border-white/70 dark:border-white/20 backdrop-blur-xl">
              <View className="flex-row items-center justify-center mb-6">
                <View className="w-16 h-16 bg-black/5 dark:bg-white/10 rounded-2xl items-center justify-center mr-4">
                  <Text className="text-4xl">🛡️</Text>
                </View>
                <Text className="text-3xl font-semibold text-gray-900 dark:text-white tracking-tight">
                  Deine Sicherheit hat höchste Priorität
                </Text>
              </View>
              <Text className="text-lg md:text-xl text-gray-700 dark:text-white/80 leading-relaxed max-w-3xl mx-auto">
                Mit unserem dreistufigen Sicherheitskonzept kannst du dich voll
                und ganz auf das Kennenlernen neuer Menschen konzentrieren.
              </Text>
            </View>
          </View>
        </View>

        {/* Events & Spontantreffen */}
        <View className="px-6 md:px-10 py-20 bg-transparent">
          <View className="max-w-7xl mx-auto">
            <View className="mb-16">
              <Text className="text-sm font-semibold text-gray-700 dark:text-white/80 bg-white/70 dark:bg-white/10 px-4 py-2 rounded-full mb-6 self-start border border-white/70 dark:border-white/20 backdrop-blur-md">
                Events & Spontantreffen
              </Text>
              <Text className="text-5xl font-semibold text-gray-900 dark:text-white mb-6 leading-tight tracking-tight">
                Entdecke Events &{"\n"}finde spontane{"\n"}Aktivitäten
              </Text>
              <Text className="text-lg md:text-xl text-gray-700 dark:text-white/80 leading-relaxed max-w-2xl">
                Von großen Festivals bis zu spontanen Spielerunden – Realite
                hilft dir, keine spannenden Events zu verpassen.
              </Text>
            </View>

            <View className="grid lg:grid-cols-2 gap-16 items-start">
              {/* Left side - Features */}
              <View className="space-y-8">
                <View className="flex-row items-start">
                  <View className="w-16 h-16 rounded-3xl bg-gradient-to-br from-purple-500 to-purple-600 items-center justify-center mr-6 shadow-lg">
                    <Text className="text-white text-2xl">✨</Text>
                  </View>
                  <View className="flex-1 pt-2">
                    <Text className="text-2xl font-semibold text-gray-900 dark:text-white mb-3 tracking-tight">
                      Veranstaltungen entdecken
                    </Text>
                    <Text className="text-gray-700 dark:text-white/80 text-lg leading-relaxed">
                      Finde spannende Events in deiner Nähe – von Konzerten bis
                      Sportveranstaltungen. Veranstalter können ihre Events
                      direkt bewerben und du findest passende Gruppen zum
                      gemeinsamen Besuch.
                    </Text>
                  </View>
                </View>

                <View className="flex-row items-start">
                  <View className="w-16 h-16 rounded-3xl bg-gradient-to-br from-blue-500 to-blue-600 items-center justify-center mr-6 shadow-lg">
                    <Text className="text-white text-2xl">👥</Text>
                  </View>
                  <View className="flex-1 pt-2">
                    <Text className="text-2xl font-semibold text-gray-900 dark:text-white mb-3 tracking-tight">
                      Spontane Aktivitäten
                    </Text>
                    <Text className="text-gray-700 dark:text-white/80 text-lg leading-relaxed">
                      Finde spontan Mitspieler für eine Runde Basketball oder
                      Brettspiele. Die App zeigt dir in Echtzeit, wer in deiner
                      Nähe Lust auf die gleiche Aktivität hat.
                    </Text>
                  </View>
                </View>

                <View className="flex-row items-start">
                  <View className="w-16 h-16 rounded-3xl bg-gradient-to-br from-green-500 to-green-600 items-center justify-center mr-6 shadow-lg">
                    <Text className="text-white text-2xl">📅</Text>
                  </View>
                  <View className="flex-1 pt-2">
                    <Text className="text-2xl font-semibold text-gray-900 dark:text-white mb-3 tracking-tight">
                      Intelligente Integration
                    </Text>
                    <Text className="text-gray-700 dark:text-white/80 text-lg leading-relaxed">
                      Die App synchronisiert sich mit deinem Kalender und
                      schlägt nur Zeiten vor, die für alle passen.
                      Benachrichtigungen sind intelligent und stören nur, wenn
                      es wirklich relevant ist.
                    </Text>
                  </View>
                </View>
              </View>

              {/* Right side - Event Cards */}
              <View className="space-y-6">
                <View className="bg-white/70 dark:bg-white/10 p-6 rounded-3xl shadow-xl border border-white/70 dark:border-white/20 backdrop-blur-xl">
                  <View className="flex-row items-center mb-4">
                    <View className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 items-center justify-center mr-4">
                      <Text className="text-white text-xl">✨</Text>
                    </View>
                    <View className="flex-1">
                      <Text className="text-xl font-semibold text-gray-900 dark:text-white tracking-tight">
                        Mainwiesen Festival
                      </Text>
                      <Text className="text-gray-600 dark:text-white/70">15. - 17. Juli</Text>
                    </View>
                    <View className="w-10 h-10 rounded-full bg-black/5 dark:bg-white/10 items-center justify-center">
                      <Text className="text-gray-800 dark:text-white text-lg">👥</Text>
                    </View>
                  </View>
                  <View className="flex-row items-center justify-between">
                    <Text className="text-emerald-800 dark:text-emerald-200 bg-emerald-100/80 dark:bg-emerald-500/15 px-3 py-1 rounded-full font-semibold">
                      Offiziell
                    </Text>
                    <Text className="text-gray-700 dark:text-white/80">
                      8 Gruppen suchen noch Mitglieder
                    </Text>
                  </View>
                </View>

                <View className="bg-white/70 dark:bg-white/10 p-6 rounded-3xl shadow-xl border border-white/70 dark:border-white/20 backdrop-blur-xl">
                  <View className="flex-row items-center mb-4">
                    <View className="w-12 h-12 rounded-2xl bg-gradient-to-br from-orange-500 to-red-500 items-center justify-center mr-4">
                      <Text className="text-white text-xl">🏐</Text>
                    </View>
                    <View className="flex-1">
                      <Text className="text-xl font-semibold text-gray-900 dark:text-white tracking-tight">
                        Spontanes Beachvolleyball
                      </Text>
                      <Text className="text-gray-600 dark:text-white/70">Mainwiesen Beach</Text>
                    </View>
                    <Text className="text-orange-800 dark:text-orange-200 bg-orange-100/80 dark:bg-orange-500/15 px-3 py-1 rounded-full font-semibold">
                      Jetzt
                    </Text>
                  </View>
                  <Text className="text-gray-700 dark:text-white/80">
                    2 von 6 Spielern gefunden
                  </Text>
                </View>

                <View className="bg-white/70 dark:bg-white/10 p-6 rounded-3xl shadow-xl border border-white/70 dark:border-white/20 backdrop-blur-xl">
                  <View className="flex-row items-center mb-4">
                    <View className="w-12 h-12 rounded-2xl bg-gradient-to-br from-gray-700 to-gray-900 items-center justify-center mr-4">
                      <Text className="text-white text-xl">🔔</Text>
                    </View>
                    <View className="flex-1">
                      <Text className="text-xl font-semibold text-gray-900 dark:text-white tracking-tight">
                        Benachrichtigungen
                      </Text>
                      <Text className="text-gray-600 dark:text-white/70">
                        Intelligent & nicht störend
                      </Text>
                    </View>
                    <View className="flex-row items-center">
                      <View className="w-3 h-3 rounded-full bg-green-500 mr-2"></View>
                      <Text className="text-green-700 dark:text-green-300 font-semibold">
                        Aktiviert
                      </Text>
                    </View>
                  </View>
                  <Text className="text-gray-700 dark:text-white/80">
                    Realite benachrichtigt dich nur bei relevanten Events und
                    Aktivitäten in deiner Nähe.
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Orte & Aktivitäten */}
        <View className="px-6 md:px-10 py-20 bg-transparent">
          <View className="max-w-7xl mx-auto">
            <View className="mb-16 text-center">
              <Text className="text-sm font-semibold text-gray-700 dark:text-white/80 bg-white/70 dark:bg-white/10 px-4 py-2 rounded-full mb-6 self-center border border-white/70 dark:border-white/20 backdrop-blur-md">
                Orte & Aktivitäten
              </Text>
              <Text className="text-5xl font-semibold text-gray-900 dark:text-white mb-6 leading-tight tracking-tight">
                Entdecke spannende Spots
              </Text>
              <Text className="text-lg md:text-xl text-gray-700 dark:text-white/80 leading-relaxed max-w-2xl mx-auto">
                Von der Lieblings-Kletterhalle bis zum geheimen Wanderweg –
                finde die perfekten Orte für deine Aktivitäten.
              </Text>
            </View>

            <View className="grid lg:grid-cols-2 gap-16 items-start">
              {/* Left side - Features */}
              <View className="space-y-8">
                <View className="flex-row items-start">
                  <View className="w-16 h-16 rounded-3xl bg-gradient-to-br from-blue-500 to-indigo-600 items-center justify-center mr-6 shadow-lg">
                    <Text className="text-white text-2xl">📍</Text>
                  </View>
                  <View className="flex-1 pt-2">
                    <Text className="text-2xl font-semibold text-gray-900 dark:text-white mb-3 tracking-tight">
                      Öffentliche & Private Spots
                    </Text>
                    <Text className="text-gray-700 dark:text-white/80 text-lg leading-relaxed">
                      Entdecke öffentliche Spots in deiner Nähe oder erstelle
                      private Spots, die nur mit ausgewählten Kreisen geteilt
                      werden.
                    </Text>
                  </View>
                </View>

                <View className="flex-row items-start">
                  <View className="w-16 h-16 rounded-3xl bg-gradient-to-br from-amber-500 to-orange-600 items-center justify-center mr-6 shadow-lg">
                    <Text className="text-white text-2xl">⭐</Text>
                  </View>
                  <View className="flex-1 pt-2">
                    <Text className="text-2xl font-bold text-gray-900 mb-3">
                      Bewertungen & Erfahrungen
                    </Text>
                    <Text className="text-gray-600 text-lg leading-relaxed">
                      Teile deine Erfahrungen und profitiere von den Bewertungen
                      anderer. So findest du immer die besten Spots für deine
                      Aktivitäten.
                    </Text>
                  </View>
                </View>

                <View className="flex-row items-start">
                  <View className="w-16 h-16 rounded-3xl bg-gradient-to-br from-purple-500 to-pink-600 items-center justify-center mr-6 shadow-lg">
                    <Text className="text-white text-2xl">🔗</Text>
                  </View>
                  <View className="flex-1 pt-2">
                    <Text className="text-2xl font-semibold text-gray-900 dark:text-white mb-3 tracking-tight">
                      Spot-Sharing
                    </Text>
                    <Text className="text-gray-700 dark:text-white/80 text-lg leading-relaxed">
                      Teile deine Lieblingsorte mit Freunden oder bestimmten
                      Kreisen. Gemeinsam entstehen so die besten Empfehlungen.
                    </Text>
                  </View>
                </View>
              </View>

              {/* Right side - Spot Cards */}
              <View className="space-y-6">
                <View className="bg-white/70 dark:bg-white/10 p-6 rounded-3xl shadow-xl border border-white/70 dark:border-white/20 backdrop-blur-xl">
                  <View className="flex-row items-center mb-4">
                    <View className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-500 items-center justify-center mr-4">
                      <Text className="text-white text-xl">🧗‍♂️</Text>
                    </View>
                    <View className="flex-1">
                      <Text className="text-xl font-semibold text-gray-900 dark:text-white tracking-tight">
                        Kletterhalle Aschaffenburg
                      </Text>
                      <View className="flex-row items-center mt-1">
                        <Text className="text-green-600 font-semibold">
                          4.8 ★
                        </Text>
                        <Text className="text-gray-600 dark:text-white/70 ml-2">
                          142 Bewertungen
                        </Text>
                      </View>
                    </View>
                    <View className="w-10 h-10 rounded-full bg-black/5 dark:bg-white/10 items-center justify-center">
                      <Text className="text-gray-800 dark:text-white text-lg">🔗</Text>
                    </View>
                  </View>
                </View>

                <View className="bg-white/70 dark:bg-white/10 p-6 rounded-3xl shadow-xl border border-white/70 dark:border-white/20 backdrop-blur-xl">
                  <View className="flex-row items-center mb-4">
                    <View className="w-12 h-12 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-500 items-center justify-center mr-4">
                      <Text className="text-white text-xl">🥾</Text>
                    </View>
                    <View className="flex-1">
                      <Text className="text-xl font-semibold text-gray-900 dark:text-white tracking-tight">
                        Wanderweg Spessart
                      </Text>
                      <View className="flex-row items-center mt-1">
                        <Text className="text-green-600 font-semibold">
                          4.9 ★
                        </Text>
                        <Text className="text-gray-600 dark:text-white/70 ml-2">
                          89 Bewertungen
                        </Text>
                      </View>
                    </View>
                    <View className="w-10 h-10 rounded-full bg-black/5 dark:bg-white/10 items-center justify-center">
                      <Text className="text-gray-800 dark:text-white text-lg">🔗</Text>
                    </View>
                  </View>
                </View>

                <View className="bg-white/70 dark:bg-white/10 p-6 rounded-3xl shadow-xl border border-white/70 dark:border-white/20 backdrop-blur-xl">
                  <View className="flex-row items-center mb-4">
                    <View className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 items-center justify-center mr-4">
                      <Text className="text-white text-xl">🍽️</Text>
                    </View>
                    <View className="flex-1">
                      <Text className="text-xl font-semibold text-gray-900 dark:text-white tracking-tight">
                        Geheimtipp Restaurant
                      </Text>
                      <View className="flex-row items-center mt-1">
                        <Text className="text-green-600 font-semibold">
                          4.7 ★
                        </Text>
                        <Text className="text-gray-600 dark:text-white/70 ml-2">
                          23 Bewertungen
                        </Text>
                      </View>
                    </View>
                    <Text className="text-purple-800 dark:text-purple-200 bg-purple-100/80 dark:bg-purple-500/15 px-3 py-1 rounded-full font-semibold">
                      Privat
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Enhanced Value Propositions */}
        <View className="px-6 md:px-10 py-24 bg-transparent">
          <View className="max-w-7xl mx-auto">
            <View className="text-center mb-20">
              <Text className="text-5xl font-semibold text-gray-900 dark:text-white mb-6 leading-tight tracking-tight">
                Warum Realite?
              </Text>
              <Text className="text-xl md:text-2xl text-gray-700 dark:text-white/80 max-w-3xl mx-auto leading-relaxed">
                Schluss mit endlosem Scrollen – hier sind die echten Vorteile
                für dein soziales Leben
              </Text>
            </View>

            <View className="grid md:grid-cols-2 gap-8">
              {[
                {
                  text: "Keine mühsame Suche – du bekommst konkrete Vorschläge, was du tun kannst",
                  icon: "🎯",
                },
                {
                  text: "Nie wieder alleine hin – finde unkompliziert Begleitung",
                  icon: "👥",
                },
                { text: "Schnell neue Menschen kennenlernen", icon: "🤝" },
                {
                  text: "Erfahre, was Freunde machen – öfter über den Weg laufen, Freundschaften vertiefen",
                  icon: "💫",
                },
                {
                  text: "Keine Insta-Flut – Events ohne dutzende Stories und Follows mitbekommen",
                  icon: "📱",
                },
                {
                  text: "Keine nervigen Terminabsprachen – Zeiten werden intelligent vorgeschlagen",
                  icon: "📅",
                },
                {
                  text: "Keine verlorenen Abende – finde das passende Publikum",
                  icon: "🌟",
                },
                {
                  text: "Nicht zuhause versauern – rausgehen, aktiv werden",
                  icon: "🚀",
                },
                {
                  text: "Dranbleiben – mit Unterstützung von anderen, z. B. gemeinsam Sport",
                  icon: "💪",
                },
                {
                  text: "Privatsphäre bewahren – du entscheidest, wer was sieht",
                  icon: "🔒",
                },
              ].map((benefit, i) => (
                <View
                  key={i}
                  className="flex-row items-start bg-white/70 dark:bg-white/10 p-8 rounded-3xl shadow-lg hover:shadow-xl transition-all duration-300 border border-white/70 dark:border-white/20 backdrop-blur-xl"
                >
                  <View className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl items-center justify-center mr-6 shadow-md">
                    <Text className="text-xl">{benefit.icon}</Text>
                  </View>
                  <Text className="text-gray-900 dark:text-white leading-relaxed text-lg font-medium flex-1">
                    {benefit.text}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* Modern Monetization Info */}
        <View className="px-6 md:px-10 py-20 bg-transparent">
          <View className="max-w-5xl mx-auto text-center">
            <View className="bg-white/70 dark:bg-white/10 p-12 rounded-3xl shadow-xl border border-white/70 dark:border-white/20 backdrop-blur-xl">
              <View className="w-20 h-20 bg-gradient-to-br from-emerald-500 to-green-600 rounded-3xl items-center justify-center mx-auto mb-8 shadow-lg">
                <Text className="text-4xl">💚</Text>
              </View>
              <Text className="text-4xl font-semibold text-gray-900 dark:text-white mb-6 tracking-tight">
                Kostenlos für Nutzer
              </Text>
              <Text className="text-lg md:text-xl text-gray-700 dark:text-white/80 leading-relaxed max-w-3xl mx-auto">
                Realite ist und bleibt für Nutzer kostenlos. Die Plattform
                finanziert sich über die Bewerbung von Events und Locations – so
                können wir dir echte Verbindungen ermöglichen, ohne dass du
                dafür bezahlen musst.
              </Text>
            </View>
          </View>
        </View>

        {/* Modern CTA Section */}
        <View
          id="download"
          className="px-8 py-32 bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 relative overflow-hidden"
        >
          {/* Background Pattern */}
          <View className="absolute inset-0 opacity-10">
            <View className="absolute top-20 left-10 w-32 h-32 bg-white rounded-full blur-3xl"></View>
            <View className="absolute bottom-20 right-10 w-40 h-40 bg-green-400 rounded-full blur-3xl"></View>
            <View className="absolute top-1/2 left-1/2 w-60 h-60 bg-blue-400 rounded-full blur-3xl transform -translate-x-1/2 -translate-y-1/2"></View>
          </View>

          <View className="max-w-5xl mx-auto text-center relative z-10">
            <Text className="text-6xl font-black text-white mb-8 leading-tight">
              Bereit für echte{"\n"}Begegnungen?
            </Text>

            <Text className="text-2xl text-blue-100 mb-6 leading-relaxed max-w-3xl mx-auto">
              Realite befindet sich in einer geschlossenen Beta
            </Text>

            <Text className="text-xl text-gray-300 mb-16 leading-relaxed max-w-2xl mx-auto">
              Die Apps sind derzeit noch nicht verfügbar. Abonniere unseren
              WhatsApp-Kanal, um die neuesten Updates und Versionen zu erhalten.
            </Text>

            {/* Main CTA */}
            <View className="mb-12">
              <Pressable
                className="bg-gradient-to-r from-green-500 to-emerald-600 px-12 py-6 rounded-3xl shadow-2xl hover:shadow-emerald-500/25 transition-all hover:brightness-110 inline-flex flex-row items-center"
                onPress={openWhatsAppChannel}
              >
                <View className="w-8 h-8 bg-white/20 rounded-full items-center justify-center mr-4">
                  <Text className="text-white text-lg">🔔</Text>
                </View>
                <Text className="text-white font-bold text-2xl">
                  WhatsApp-Kanal abonnieren
                </Text>
              </Pressable>
            </View>

            {/* Additional Info */}
            <View className="bg-white/5 backdrop-blur-sm p-8 rounded-3xl border border-white/10">
              <Text className="text-gray-300 text-lg mb-4">
                🚀 Werde Teil der ersten Nutzer und gestalte Realite mit
              </Text>
              <Text className="text-gray-400">
                Exklusive Updates • Beta-Zugang • Behind-the-Scenes
              </Text>
            </View>
          </View>
        </View>

        {/* Modern Footer */}
        <View className="px-8 py-16 bg-gradient-to-br from-gray-900 to-slate-900">
          <View className="max-w-7xl mx-auto">
            <View className="flex-row justify-between items-start mb-12">
              <View>
                <View className="flex-row items-center mb-4">
                  <View className="w-12 h-12 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl items-center justify-center mr-4 shadow-lg">
                    <Text className="text-white text-xl font-bold">R</Text>
                  </View>
                  <Text className="text-3xl font-bold text-white">Realite</Text>
                </View>
                <Text className="text-gray-300 text-lg mb-6 max-w-md">
                  Die App für echte Verbindungen – Menschen im echten Leben
                  zusammenbringen.
                </Text>
                <Pressable
                  className="bg-gradient-to-r from-green-500 to-emerald-600 px-6 py-3 rounded-2xl shadow-lg hover:shadow-xl transition-all hover:brightness-110 inline-flex flex-row items-center"
                  onPress={openWhatsAppChannel}
                >
                  <Text className="text-white text-lg mr-2">🔔</Text>
                  <Text className="text-white font-semibold">
                    Updates erhalten
                  </Text>
                </Pressable>
              </View>

              <View className="flex-row gap-12">
                <View>
                  <Text className="text-white font-bold text-lg mb-4">
                    Rechtliches
                  </Text>
                  <View className="space-y-3">
                    <Pressable>
                      <Text className="text-gray-400 hover:text-white transition-colors">
                        Impressum
                      </Text>
                    </Pressable>
                    <Pressable>
                      <Text className="text-gray-400 hover:text-white transition-colors">
                        Datenschutz
                      </Text>
                    </Pressable>
                    <Pressable>
                      <Text className="text-gray-400 hover:text-white transition-colors">
                        AGB
                      </Text>
                    </Pressable>
                  </View>
                </View>

                <View>
                  <Text className="text-white font-bold text-lg mb-4">
                    Status
                  </Text>
                  <View className="space-y-3">
                    <View className="flex-row items-center">
                      <View className="w-3 h-3 rounded-full bg-amber-500 mr-2"></View>
                      <Text className="text-gray-400">Closed Beta</Text>
                    </View>
                    <Text className="text-gray-400">Apps in Entwicklung</Text>
                    <Text className="text-gray-400">Community aufbauend</Text>
                  </View>
                </View>
              </View>
            </View>

            <View className="border-t border-gray-700 pt-8 flex-row justify-between items-center">
              <Text className="text-gray-400">
                © 2025 Realite • Entwickelt von CLYE GmbH
              </Text>
              <Text className="text-gray-500">
                Echte Verbindungen. Echte Momente.
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
