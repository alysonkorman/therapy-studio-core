import { createResource } from "../../models";

export const interventions = [
  createResource({
    type: "intervention",
    title: "Feelings Jenga",
    description: "Identify and discuss emotions while playing Jenga.",

    worksWellWhen: [
      "They're shutting down",
      "They answer 'I don't know'",
      "Rapport is weak",
    ],

    kidsWhoLike: ["Pokémon", "Minecraft", "Drawing"],

    goals: ["Emotion identification", "Rapport", "Externalization"],

    durationMinutes: 15,
  }),
];
