import React from "react";

import { Icon, Label, NativeTabs } from "expo-router/unstable-native-tabs";

export default function TabLayout() {
  return (
    <NativeTabs minimizeBehavior="onScrollDown">
      <NativeTabs.Trigger name="index">
        <Label>Start</Label>
        <Icon sf="calendar.and.person" drawable="home_24" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="my-plans">
        <Label>Meine Pläne</Label>
        <Icon sf="calendar.and.person" drawable="calendar_today" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="explore">
        <Label>Entdecken</Label>
        <Icon sf="location" drawable="map_24" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="profile">
        <Label>Profil</Label>
        <Icon sf="person.fill" drawable="person_24" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
