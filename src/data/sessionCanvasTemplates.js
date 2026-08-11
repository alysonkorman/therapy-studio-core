import { sessionCanvasTemplateSchema } from "../models/sessionCanvasTemplate";

const thermometerColors = ["#2F766D", "#3867A6", "#E4B83F", "#D17A22", "#B14C4C"];
const thermometerLabels = [
  "1 — Calm / Comfortable",
  "2 — Small Feeling",
  "3 — Medium Feeling",
  "4 — Big Feeling",
  "5 — Very Big Feeling",
];

const thermometerObjects = thermometerColors.flatMap((fillColor, index) => {
  const y = 540 - index * 105;
  return [
    {
      id: `thermometer-level-${index + 1}`,
      kind: "rectangle",
      x: 250,
      y,
      width: 500,
      height: 90,
      strokeColor: "#28252C",
      fillColor,
      strokeWidth: 3,
    },
    {
      id: `thermometer-label-${index + 1}`,
      kind: "text",
      text: thermometerLabels[index],
      x: 275,
      y: y + 38,
      color: "#28252C",
      size: 24,
    },
    {
      id: `thermometer-example-${index + 1}`,
      kind: "text",
      text: "Type an example…",
      x: 500,
      y: y + 70,
      color: "#28252C",
      size: 19,
    },
  ];
});

const shieldPoints = [
  { x: 300, y: 140 },
  { x: 500, y: 90 },
  { x: 700, y: 140 },
  { x: 675, y: 430 },
  { x: 500, y: 610 },
  { x: 325, y: 430 },
  { x: 300, y: 140 },
];

const templates = [
  {
    id: "session-canvas-feelings-thermometer",
    templateVersion: 1,
    title: "Feelings Thermometer",
    description: "Notice, name, and draw feelings at different intensity levels.",
    category: "Emotional Awareness",
    goals: ["Emotion identification", "Regulation", "Intensity scaling"],
    objects: thermometerObjects,
  },
  {
    id: "session-canvas-blank-shield",
    templateVersion: 1,
    title: "Blank Shield",
    description: "Decorate a personal shield with strengths, comforts, and symbols.",
    category: "Creative Coping",
    goals: ["Coping", "Safety and comfort", "Strengths", "Imagination"],
    objects: [
      {
        id: "shield-outline",
        kind: "stroke",
        points: shieldPoints,
        color: "#67529D",
        width: 8,
      },
      {
        id: "shield-prompt",
        kind: "text",
        text: "Make this shield your own",
        x: 345,
        y: 190,
        color: "#28252C",
        size: 28,
      },
    ],
  },
  {
    id: "session-canvas-blank",
    templateVersion: 1,
    title: "Blank Canvas",
    description: "Start with an open canvas for drawing, writing, and visuals.",
    category: "Open Activity",
    goals: [],
    objects: [],
  },
].map((template) => sessionCanvasTemplateSchema.parse(template));

function deepFreeze(value) {
  Object.freeze(value);
  Object.values(value).forEach((nested) => {
    if (nested && typeof nested === "object" && !Object.isFrozen(nested)) {
      deepFreeze(nested);
    }
  });
  return value;
}

export const sessionCanvasTemplates = deepFreeze(templates);

export function getSessionCanvasTemplate(templateId) {
  return sessionCanvasTemplates.find(({ id }) => id === templateId) ?? null;
}
