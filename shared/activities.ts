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
import tinycolor from "tinycolor2";

export const activities = {
  sport: {
    name: "Sport",
    nameDe: "Sport",
    color: "#4CAF50",
    emoji: "🏅",
    subActivities: {
      basketball: { name: "Basketball", nameDe: "Basketball" },
      soccer: { name: "Soccer", nameDe: "Fußball" },
      tennis: { name: "Tennis", nameDe: "Tennis" },
      running: { name: "Running", nameDe: "Laufen" },
      swimming: { name: "Swimming", nameDe: "Schwimmen" },
      cycling: { name: "Cycling", nameDe: "Radfahren" },
      volleyball: { name: "Volleyball", nameDe: "Volleyball" },
      yoga: { name: "Yoga", nameDe: "Yoga" },
      hiking: { name: "Hiking", nameDe: "Wandern" },
      gym: { name: "Gym Workout", nameDe: "Fitnessstudio" },
      climbing: { name: "Climbing", nameDe: "Klettern" },
      martial_arts: { name: "Martial Arts", nameDe: "Kampfsport" },
    },
  },
  food_drink: {
    name: "Food & Drink",
    nameDe: "Essen & Trinken",
    color: "#FF9800",
    emoji: "🍽️",
    subActivities: {
      restaurant: { name: "Restaurant", nameDe: "Restaurant" },
      cafe: { name: "Café", nameDe: "Café" },
      bar: { name: "Bar", nameDe: "Bar" },
      picnic: { name: "Picnic", nameDe: "Picknick" },
      cooking: { name: "Cooking Together", nameDe: "Gemeinsam Kochen" },
      wine_tasting: { name: "Wine Tasting", nameDe: "Weinprobe" },
      brunch: { name: "Brunch", nameDe: "Brunch" },
      street_food: { name: "Street Food", nameDe: "Street Food" },
    },
  },
  arts_culture: {
    name: "Arts & Culture",
    nameDe: "Kunst & Kultur",
    color: "#9C27B0",
    emoji: "🎭",
    subActivities: {
      museum: { name: "Museum", nameDe: "Museum" },
      gallery: { name: "Art Gallery", nameDe: "Kunstgalerie" },
      theater: { name: "Theater", nameDe: "Theater" },
      concert: { name: "Concert", nameDe: "Konzert" },
      movie: { name: "Movie", nameDe: "Film" },
      opera: { name: "Opera", nameDe: "Oper" },
      dance: { name: "Dance Performance", nameDe: "Tanzaufführung" },
      literature: {
        name: "Literature/Book Club",
        nameDe: "Literatur/Buchclub",
      },
      festival: { name: "Festival", nameDe: "Festival" },
    },
  },
  social: {
    name: "Social",
    nameDe: "Soziales",
    color: "#03A9F4",
    emoji: "🧑‍🤝‍🧑",
    subActivities: {
      party: { name: "Party", nameDe: "Party" },
      board_games: { name: "Board Games", nameDe: "Brettspiele" },
      meetup: { name: "Meetup", nameDe: "Meetup" },
      networking: { name: "Networking", nameDe: "Networking" },
      coffee_chat: { name: "Coffee Chat", nameDe: "Kaffeeplausch" },
      family_gathering: { name: "Family Gathering", nameDe: "Familientreffen" },
      celebration: { name: "Celebration", nameDe: "Feier" },
      volunteering: { name: "Volunteering", nameDe: "Ehrenamt" },
    },
  },
  learning: {
    name: "Learning",
    nameDe: "Lernen",
    color: "#FFC107",
    emoji: "📚",
    subActivities: {
      workshop: { name: "Workshop", nameDe: "Workshop" },
      class: { name: "Class", nameDe: "Kurs" },
      seminar: { name: "Seminar", nameDe: "Seminar" },
      language_exchange: {
        name: "Language Exchange",
        nameDe: "Sprachaustausch",
      },
      hackathon: { name: "Hackathon", nameDe: "Hackathon" },
      lecture: { name: "Lecture", nameDe: "Vortrag" },
      study_group: { name: "Study Group", nameDe: "Lerngruppe" },
    },
  },
  outdoors: {
    name: "Outdoors",
    nameDe: "Draußen",
    color: "#8BC34A",
    emoji: "🌳",
    subActivities: {
      camping: { name: "Camping", nameDe: "Camping" },
      fishing: { name: "Fishing", nameDe: "Angeln" },
      boating: { name: "Boating", nameDe: "Bootfahren" },
      beach: { name: "Beach", nameDe: "Strand" },
      sightseeing: { name: "Sightseeing", nameDe: "Sehenswürdigkeiten" },
      stargazing: { name: "Stargazing", nameDe: "Sterne beobachten" },
      gardening: { name: "Gardening", nameDe: "Gärtnern" },
      birdwatching: { name: "Birdwatching", nameDe: "Vogelbeobachtung" },
    },
  },
  travel: {
    name: "Travel",
    nameDe: "Reisen",
    color: "#E91E63",
    emoji: "✈️",
    subActivities: {
      day_trip: { name: "Day Trip", nameDe: "Tagesausflug" },
      city_tour: { name: "City Tour", nameDe: "Stadtrundfahrt" },
      road_trip: { name: "Road Trip", nameDe: "Roadtrip" },
      international: { name: "International Travel", nameDe: "Auslandsreise" },
      hiking_trip: { name: "Hiking Trip", nameDe: "Wanderreise" },
      cruise: { name: "Cruise", nameDe: "Kreuzfahrt" },
    },
  },
  wellness: {
    name: "Wellness",
    nameDe: "Wellness",
    color: "#00BCD4",
    emoji: "🧘",
    subActivities: {
      meditation: { name: "Meditation", nameDe: "Meditation" },
      spa: { name: "Spa", nameDe: "Spa" },
      massage: { name: "Massage", nameDe: "Massage" },
      retreat: { name: "Retreat", nameDe: "Retreat" },
      sauna: { name: "Sauna", nameDe: "Sauna" },
      mindfulness: { name: "Mindfulness", nameDe: "Achtsamkeit" },
    },
  },
  home: {
    name: "At Home",
    nameDe: "Zuhause",
    color: "#607D8B",
    emoji: "🏠",
    subActivities: {
      movie_night: { name: "Movie Night", nameDe: "Filmabend" },
      dinner_party: { name: "Dinner Party", nameDe: "Dinnerparty" },
      game_night: { name: "Game Night", nameDe: "Spieleabend" },
      crafting: { name: "Crafting", nameDe: "Basteln" },
      baking: { name: "Baking", nameDe: "Backen" },
      home_improvement: {
        name: "Home Improvement",
        nameDe: "Hausverbesserung",
      },
      reading: { name: "Reading", nameDe: "Lesen" },
    },
  },
};

export const activityGroupIds = Object.keys(activities);
export const activityIds = Object.entries(activities)
  .flatMap(([groupId, group]) =>
    Object.entries(group.subActivities).map(
      ([subActivityId]) => `${groupId}/${subActivityId}`
    )
  )
  .concat(activityGroupIds) as ActivityId[];

export type ActivityGroupId = keyof typeof activities;
export type ActivityId =
  | ActivityGroupId
  | {
      [key in ActivityGroupId]: `${key}/${keyof (typeof activities)[key]["subActivities"] & string}`;
    }[ActivityGroupId];

export const searchTermForActivityMap: Partial<Record<ActivityId, string>> = {
  "sport/climbing": "Klettern",
  "food_drink/restaurant": "Restaurant",
  "arts_culture/museum": "Museum",
  "social/coffee_chat": "Kaffeeplausch",
  "social/party": "Party",
  "social/meetup": "Meetup",
  social: "Soziales",
  learning: "Lernen",
  outdoors: "Draußen",
  travel: "Reisen",
  wellness: "Wellness",
  home: "Zuhause",
};

export const getSearchTermForActivity = (activityId: ActivityId): string => {
  const direct = searchTermForActivityMap[activityId];
  if (direct) return direct;
  const [groupId, subActivityId] = activityId.split("/");
  const group = activities[groupId as ActivityGroupId];
  if (!group) return activityId;
  const subActivity =
    group.subActivities[subActivityId as keyof typeof group.subActivities];
  if (!subActivity) return "";
  return activityId;
};

export const getGroupIdFromActivity = (
  activityId?: ActivityId
): ActivityGroupId | undefined => {
  if (!activityId) return undefined;
  const [groupId] = (activityId as string).split("/");
  return groupId as ActivityGroupId;
};

export const getActivityGradient = (activityId?: ActivityId) => {
  const groupId = getGroupIdFromActivity(activityId);
  const base = (groupId && activities[groupId]?.color) || "#94a3b8";
  const c1 = tinycolor(base).lighten(35).toHexString();
  const c2 = tinycolor(base).lighten(15).toHexString();
  const c3 = tinycolor(base).toHexString();
  return [c1, c2, c3] as const;
};

export const getActivityLabel = (id?: ActivityId) => {
  if (!id) return "";
  const [groupId, subId] = (id as string).split("/");
  const group = activities[groupId as keyof typeof activities];
  if (!group) return id as string;
  if (!subId) return group.nameDe || group.name;
  const sub: any =
    group.subActivities[subId as keyof typeof group.subActivities];
  return sub
    ? `${group.nameDe || group.name}/${sub.nameDe || sub.name}`
    : (id as string);
};

export const getActivityIconColor = (activityId: ActivityId) => {
  const groupId = getGroupIdFromActivity(activityId);
  const base = activities[groupId!]?.color ?? "#64748b";
  return tinycolor(base).darken(10).toHexString();
};

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
