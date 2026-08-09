import { worksheetDocumentSchema, worksheetSchema } from "../../models";

const CREATED_AT = "2026-08-09T12:00:00.000Z";
const SOURCE = "Therapy Studio original";
const DEFAULTS = {
  documentVersion: 1,
  createdAt: CREATED_AT,
  updatedAt: CREATED_AT,
};

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  Object.values(value).forEach(deepFreeze);
  return Object.freeze(value);
}

function block(id, type, content) {
  return { id, type, sortOrder: Number(id.split("-").at(-1)), ...content };
}

function starter({
  id,
  title,
  description,
  category,
  goals,
  tags,
  ageRanges,
  relatedResourceIds = [],
  blocks,
}) {
  const resource = worksheetSchema.parse({
    id,
    type: "worksheet",
    title,
    description,
    category,
    color: "#7C3AED",
    iconId: "",
    attribution: SOURCE,
    provenance: "therapy-studio-starter",
    format: "editable",
    goals,
    tags,
    ageRanges,
    relatedResourceIds,
    telehealthFriendly: true,
    source: SOURCE,
    createdAt: CREATED_AT,
    updatedAt: CREATED_AT,
  });
  const document = worksheetDocumentSchema.parse({
    ...DEFAULTS,
    worksheetId: id,
    pages: [
      {
        id: `${id}-page-1`,
        title,
        sortOrder: 0,
        settings: {},
        blocks: blocks.map((entry, index) => ({ ...entry, sortOrder: index })),
      },
    ],
  });
  return deepFreeze({ resource, document });
}

const starters = [
  starter({
    id: "worksheet-starter-worry-thermometer",
    title: "My Worry Thermometer",
    description: "Notice how big a worry feels and choose support that fits.",
    category: "Anxiety",
    goals: ["Anxiety awareness", "Emotion identification", "Coping skills"],
    tags: ["worry", "scaling", "regulation"],
    ageRanges: ["5–7", "8–10", "11–13", "14–17"],
    relatedResourceIds: ["intervention-worry-thermometer"],
    blocks: [
      block("worry-0", "instruction", {
        text: "Choose the number that best matches your worry right now. There is no wrong answer.",
        alignment: "left",
      }),
      block("worry-1", "rating-scale", {
        prompt: "How big is the worry?",
        minimum: 0,
        maximum: 5,
        minimumLabel: "No worry",
        maximumLabel: "Very big worry",
        showNumbers: true,
      }),
      block("worry-2", "short-response", {
        prompt: "What is the worry saying?",
        placeholder: "The worry says…",
        lineCount: 2,
      }),
      block("worry-3", "checklist", {
        prompt: "What kind of support could fit this number?",
        items: [
          "A slow breath",
          "Move my body",
          "Ask someone for help",
          "Take one small step",
          "Pause and come back",
        ],
        allowOther: true,
      }),
      block("worry-4", "short-response", {
        prompt: "After trying support, what number fits now?",
        placeholder: "My number is…",
        lineCount: 1,
      }),
    ],
  }),
  starter({
    id: "worksheet-starter-thought-detective",
    title: "Thought Detective",
    description: "Look at a sticky thought with curiosity and gather more than one clue.",
    category: "Thinking Skills",
    goals: ["Cognitive flexibility", "Thought awareness", "Problem solving"],
    tags: ["thoughts", "clues", "perspective"],
    ageRanges: ["8–10", "11–13", "14–17"],
    relatedResourceIds: ["intervention-thought-detective"],
    blocks: [
      block("thought-0", "short-response", {
        prompt: "What thought is your brain giving you?",
        placeholder: "My thought is…",
        lineCount: 2,
      }),
      block("thought-1", "long-response", {
        prompt: "What clues make the thought seem true?",
        placeholder: "Clues I notice…",
        lineCount: 4,
      }),
      block("thought-2", "long-response", {
        prompt: "What clues show there may be another possibility?",
        placeholder: "Other clues…",
        lineCount: 4,
      }),
      block("thought-3", "short-response", {
        prompt: "What is a more balanced thought you could try?",
        placeholder: "Another way to see it…",
        lineCount: 3,
      }),
    ],
  }),
  starter({
    id: "worksheet-starter-calm-down-plan",
    title: "My Calm-Down Plan",
    description: "Build a short plan for getting back to a steadier place.",
    category: "Regulation",
    goals: ["Emotional regulation", "Coping skills", "Planning"],
    tags: ["calming", "plan", "regulation"],
    ageRanges: ["5–7", "8–10", "11–13", "14–17"],
    relatedResourceIds: ["intervention-calm-down-plan"],
    blocks: [
      block("calm-0", "checklist", {
        prompt: "How do I know I am getting overwhelmed?",
        items: [
          "My body feels tight",
          "My thoughts speed up",
          "I get quiet",
          "I want to leave",
          "I feel extra wiggly",
        ],
        allowOther: true,
      }),
      block("calm-1", "checklist", {
        prompt: "Things that may help me feel steadier",
        items: [
          "Breathe slowly",
          "Move or stretch",
          "Use a quiet space",
          "Get a drink",
          "Talk to a safe person",
        ],
        allowOther: true,
      }),
      block("calm-2", "short-response", {
        prompt: "The first thing I want to try is…",
        placeholder: "My first step…",
        lineCount: 2,
      }),
      block("calm-3", "short-response", {
        prompt: "A person who can help is…",
        placeholder: "Someone I can ask…",
        lineCount: 2,
      }),
    ],
  }),
  starter({
    id: "worksheet-starter-body-clues",
    title: "Body Clues Check-In",
    description: "Notice body signals and connect them with feelings and needs.",
    category: "Emotions",
    goals: ["Body awareness", "Emotion identification", "Self-advocacy"],
    tags: ["interoception", "body clues", "check-in"],
    ageRanges: ["5–7", "8–10", "11–13", "14–17"],
    relatedResourceIds: ["intervention-body-clues-check-in"],
    blocks: [
      block("body-0", "drawing-area", {
        prompt: "Mark or draw where you notice a body clue.",
        height: "medium",
      }),
      block("body-1", "checklist", {
        prompt: "What do you notice?",
        items: [
          "Fast or slow heartbeat",
          "Tight or loose muscles",
          "Warm or cold",
          "Heavy or light",
          "Still or wiggly",
          "Empty or full",
        ],
        allowOther: true,
      }),
      block("body-2", "short-response", {
        prompt: "This clue might be telling me…",
        placeholder: "A feeling or need…",
        lineCount: 2,
      }),
      block("body-3", "short-response", {
        prompt: "One helpful next step could be…",
        placeholder: "I could…",
        lineCount: 2,
      }),
    ],
  }),
  starter({
    id: "worksheet-starter-coping-choices",
    title: "Coping Choices",
    description: "Compare a few coping choices and pick one that fits now.",
    category: "Coping Skills",
    goals: ["Coping skills", "Decision making", "Self-awareness"],
    tags: ["coping", "choices", "regulation"],
    ageRanges: ["8–10", "11–13", "14–17"],
    relatedResourceIds: ["intervention-coping-choice-map"],
    blocks: [
      block("coping-0", "short-response", {
        prompt: "What feeling or need are you working with?",
        placeholder: "Right now…",
        lineCount: 2,
      }),
      block("coping-1", "checklist", {
        prompt: "Which kinds of choices could fit?",
        items: [
          "Something calming",
          "Something active",
          "Something creative",
          "Connection with someone",
          "A short break",
          "One small problem-solving step",
        ],
        allowOther: true,
      }),
      block("coping-2", "short-response", {
        prompt: "The choice I will test is…",
        placeholder: "I will try…",
        lineCount: 2,
      }),
      block("coping-3", "multiple-choice", {
        prompt: "After trying it, I want to…",
        options: ["Keep using it", "Change it a little", "Try a different choice"],
        selectionMode: "single",
      }),
    ],
  }),
  starter({
    id: "worksheet-starter-problem-solving",
    title: "Problem-Solving Steps",
    description: "Slow down a problem and choose a manageable next step.",
    category: "Executive Function",
    goals: ["Problem solving", "Executive functioning", "Flexible thinking"],
    tags: ["problems", "choices", "planning"],
    ageRanges: ["8–10", "11–13", "14–17"],
    relatedResourceIds: ["intervention-problem-solving-steps"],
    blocks: [
      block("problem-0", "short-response", {
        prompt: "What is the problem, in a few words?",
        placeholder: "The problem is…",
        lineCount: 2,
      }),
      block("problem-1", "long-response", {
        prompt: "What are three possible choices?",
        placeholder: "1.\n2.\n3.",
        lineCount: 5,
      }),
      block("problem-2", "short-response", {
        prompt: "Which choice seems safest and most helpful?",
        placeholder: "I choose…",
        lineCount: 2,
      }),
      block("problem-3", "short-response", {
        prompt: "What is the smallest first step?",
        placeholder: "First, I can…",
        lineCount: 2,
      }),
      block("problem-4", "short-response", {
        prompt: "Who or what could help?",
        placeholder: "Support I can use…",
        lineCount: 2,
      }),
    ],
  }),
  starter({
    id: "worksheet-starter-social-replay",
    title: "What Happened? Social Situation Replay",
    description: "Replay a social moment and explore more than one possible response.",
    category: "Social Skills",
    goals: ["Social problem solving", "Perspective taking", "Communication"],
    tags: ["social skills", "replay", "perspective"],
    ageRanges: ["8–10", "11–13", "14–17"],
    relatedResourceIds: ["intervention-social-situation-replay"],
    blocks: [
      block("social-0", "long-response", {
        prompt: "What happened? Stick to what a camera might have seen or heard.",
        placeholder: "First… then…",
        lineCount: 4,
      }),
      block("social-1", "short-response", {
        prompt: "What were you thinking or feeling?",
        placeholder: "I noticed…",
        lineCount: 3,
      }),
      block("social-2", "short-response", {
        prompt: "What might the other person have been thinking or feeling?",
        placeholder: "Maybe…",
        lineCount: 3,
      }),
      block("social-3", "long-response", {
        prompt: "What are two responses you could try next time?",
        placeholder: "One choice…\nAnother choice…",
        lineCount: 4,
      }),
    ],
  }),
  starter({
    id: "worksheet-starter-support-team",
    title: "My Support Team",
    description: "Name people and ways to ask for the kind of support you need.",
    category: "Connection",
    goals: ["Help seeking", "Communication", "Support identification"],
    tags: ["support", "connection", "communication"],
    ageRanges: ["5–7", "8–10", "11–13", "14–17"],
    blocks: [
      block("support-0", "instruction", {
        text: "Your support team can include people at home, school, or in your community.",
        alignment: "left",
      }),
      block("support-1", "long-response", {
        prompt: "People I can go to",
        placeholder: "Names or roles…",
        lineCount: 4,
      }),
      block("support-2", "checklist", {
        prompt: "Ways someone could help",
        items: [
          "Listen",
          "Help me make a plan",
          "Stay nearby",
          "Give me space",
          "Help me explain",
          "Do something calming with me",
        ],
        allowOther: true,
      }),
      block("support-3", "short-response", {
        prompt: "Words I can use to ask for help",
        placeholder: "Could you please…",
        lineCount: 3,
      }),
    ],
  }),
  starter({
    id: "worksheet-starter-before-during-after",
    title: "Before / During / After",
    description: "Plan support before a hard moment and notice what helps afterward.",
    category: "Planning",
    goals: ["Planning", "Self-awareness", "Emotional regulation"],
    tags: ["before", "during", "after", "plan"],
    ageRanges: ["8–10", "11–13", "14–17"],
    blocks: [
      block("bda-0", "long-response", {
        prompt: "Before: What can help me get ready?",
        placeholder: "I can prepare by…",
        lineCount: 3,
      }),
      block("bda-1", "long-response", {
        prompt: "During: What can help me stay with it?",
        placeholder: "In the moment, I can…",
        lineCount: 3,
      }),
      block("bda-2", "long-response", {
        prompt: "After: What will help me recover or reflect?",
        placeholder: "Afterward, I can…",
        lineCount: 3,
      }),
      block("bda-3", "short-response", {
        prompt: "The support I most want to remember is…",
        placeholder: "Remember…",
        lineCount: 2,
      }),
    ],
  }),
  starter({
    id: "worksheet-starter-brave-plan",
    title: "My Brave Plan",
    description: "Choose one small, supported step toward something that matters.",
    category: "Anxiety",
    goals: ["Approach coping", "Confidence", "Planning"],
    tags: ["bravery", "small steps", "support"],
    ageRanges: ["5–7", "8–10", "11–13", "14–17"],
    blocks: [
      block("brave-0", "short-response", {
        prompt: "What is something you want to feel more able to do?",
        placeholder: "I want to…",
        lineCount: 2,
      }),
      block("brave-1", "short-response", {
        prompt: "What is one small brave step—not the whole thing?",
        placeholder: "My small step…",
        lineCount: 2,
      }),
      block("brave-2", "checklist", {
        prompt: "What support could help?",
        items: [
          "Practice first",
          "Have someone nearby",
          "Bring a comfort item",
          "Use a coping skill",
          "Choose a pause signal",
        ],
        allowOther: true,
      }),
      block("brave-3", "short-response", {
        prompt: "How will you notice your effort afterward?",
        placeholder: "I will remind myself…",
        lineCount: 2,
      }),
    ],
  }),
];

export const worksheetStarters = deepFreeze(starters.map(({ resource }) => resource));
export const worksheetStarterDocuments = deepFreeze(
  Object.fromEntries(starters.map(({ resource, document }) => [resource.id, document]))
);

export function isWorksheetStarter(id) {
  return Object.hasOwn(worksheetStarterDocuments, id);
}

export function getWorksheetStarterDocument(id) {
  return worksheetStarterDocuments[id] ?? null;
}
