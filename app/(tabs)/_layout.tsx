import React from "react";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import {
  Icon,
  Label,
  NativeTabs,
  VectorIcon,
} from "expo-router/unstable-native-tabs";

export default function TabLayout() {
  return (
    <NativeTabs minimizeBehavior="onScrollDown">
      <NativeTabs.Trigger name="index">
        <Label>Start</Label>
        <Icon
          sf="calendar.and.person"
          androidSrc={<VectorIcon family={MaterialCommunityIcons} name="home" />}
        />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="my-plans">
        <Label>Meine Pläne</Label>
        <Icon
          sf="calendar.and.person"
          androidSrc={
            <VectorIcon family={MaterialCommunityIcons} name="calendar" />
          }
        />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="explore">
        <Label>Entdecken</Label>
        <Icon
          sf="location"
          androidSrc={<VectorIcon family={MaterialCommunityIcons} name="map" />}
        />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="profile">
        <Label>Profil</Label>
        <Icon
          sf="person.fill"
          androidSrc={<VectorIcon family={MaterialCommunityIcons} name="account" />}
        />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
