import {
  BookIcon,
  CalendarIcon,
  ForkKnifeIcon,
  HeartIcon,
  HomeIcon,
  MountainIcon,
  PersonStandingIcon,
  PlaneIcon,
  TheaterIcon,
  UsersIcon,
} from "lucide-react-native";
import { getGroupIdFromActivity, type ActivityId } from "./activities";

export const getActivityIcon = (activityId: ActivityId) => {
  const groupId = getGroupIdFromActivity(activityId);
  switch (groupId) {
    case "food_drink":
      return ForkKnifeIcon;
    case "outdoors":
      return MountainIcon;
    case "social":
      return UsersIcon;
    case "sport":
      return PersonStandingIcon;
    case "arts_culture":
      return TheaterIcon;
    case "learning":
      return BookIcon;
    case "travel":
      return PlaneIcon;
    case "wellness":
      return HeartIcon;
    case "home":
      return HomeIcon;
    default:
      return CalendarIcon;
  }
};

