import { resourceSchema } from "../../models";

export const interventions = [
  resourceSchema.parse({
    id: "intervention-feelings-jenga",
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

    createdAt: "2026-08-01T02:45:27.000Z",
    updatedAt: "2026-08-01T02:45:27.000Z",
  }),
];
