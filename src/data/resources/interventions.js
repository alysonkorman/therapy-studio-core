import { interventionGuidanceSchema, resourceSchema } from "../../models";

const CREATED_AT = "2026-08-01T02:45:27.000Z";
const ORIGINAL_SOURCE = "Therapy Studio original";

function intervention(input) {
  return resourceSchema.parse({
    type: "intervention",
    telehealthFriendly: true,
    createdAt: CREATED_AT,
    updatedAt: CREATED_AT,
    ...input,
  });
}

export const interventions = [
  intervention({
    id: "intervention-feelings-jenga",
    title: "Feelings Jenga",
    description: "Identify and discuss emotions while playing Jenga.",
    worksWellWhen: [
      "They're shutting down",
      "They answer 'I don't know'",
      "Rapport is weak",
    ],
    kidsWhoLike: ["Pokémon", "Minecraft", "Drawing"],
    goals: ["Emotion identification", "Rapport", "Externalization"],
    tags: ["feelings", "play", "conversation"],
    ageRanges: ["8–10", "11–13"],
    materials: ["Jenga blocks or another stacking-block game"],
    durationMinutes: 15,
  }),
  intervention({
    id: "intervention-coping-choice-map",
    title: "Coping Choice Map",
    description: "Compare coping options and choose one that fits the current moment.",
    goals: ["Coping skills", "Decision making", "Self-awareness"],
    tags: ["coping", "choices", "regulation"],
    ageRanges: ["8–10", "11–13", "14–17"],
    materials: ["Paper or shared whiteboard", "Marker"],
    durationMinutes: 15,
    source: ORIGINAL_SOURCE,
  }),
  intervention({
    id: "intervention-worry-thermometer",
    title: "Worry Thermometer",
    description: "Give worry a simple intensity rating and match support to the level.",
    goals: ["Anxiety awareness", "Emotion identification", "Coping skills"],
    tags: ["worry", "scaling", "regulation"],
    ageRanges: ["5–7", "8–10", "11–13"],
    materials: ["Paper or shared whiteboard"],
    durationMinutes: 10,
    source: ORIGINAL_SOURCE,
  }),
  intervention({
    id: "intervention-thought-detective",
    title: "Thought Detective",
    description: "Look for clues that support or challenge a sticky thought.",
    goals: ["Cognitive flexibility", "Thought awareness", "Problem solving"],
    tags: ["thoughts", "clues", "perspective"],
    ageRanges: ["8–10", "11–13", "14–17"],
    materials: ["Paper or shared document"],
    durationMinutes: 20,
    source: ORIGINAL_SOURCE,
  }),
  intervention({
    id: "intervention-calm-down-plan",
    title: "Calm-Down Plan",
    description:
      "Build a brief, personalized sequence for returning to a steadier state.",
    goals: ["Emotional regulation", "Coping skills", "Planning"],
    tags: ["calming", "plan", "regulation"],
    ageRanges: ["5–7", "8–10", "11–13", "14–17"],
    materials: ["Paper or shared whiteboard"],
    durationMinutes: 20,
    source: ORIGINAL_SOURCE,
  }),
  intervention({
    id: "intervention-social-situation-replay",
    title: "Social Situation Replay",
    description: "Replay a social moment and practice more than one possible response.",
    goals: ["Social problem solving", "Perspective taking", "Communication"],
    tags: ["social skills", "rehearsal", "perspective"],
    ageRanges: ["8–10", "11–13", "14–17"],
    materials: [],
    durationMinutes: 20,
    source: ORIGINAL_SOURCE,
  }),
  intervention({
    id: "intervention-body-clues-check-in",
    title: "Body Clues Check-In",
    description:
      "Notice body signals and connect them with needs, feelings, and choices.",
    goals: ["Body awareness", "Emotion identification", "Self-advocacy"],
    tags: ["interoception", "body clues", "check-in"],
    ageRanges: ["5–7", "8–10", "11–13", "14–17"],
    materials: ["Optional body outline or paper"],
    durationMinutes: 10,
    source: ORIGINAL_SOURCE,
  }),
  intervention({
    id: "intervention-problem-solving-steps",
    title: "Problem-Solving Steps",
    description: "Slow down a problem and move from naming it to choosing a next step.",
    goals: ["Problem solving", "Executive functioning", "Flexible thinking"],
    tags: ["problems", "choices", "planning"],
    ageRanges: ["8–10", "11–13", "14–17"],
    materials: ["Paper or shared whiteboard"],
    durationMinutes: 15,
    source: ORIGINAL_SOURCE,
  }),
];

const guidanceRecords = [
  {
    resourceId: "intervention-feelings-jenga",
    overview: "Pair a familiar block game with low-pressure emotion questions.",
    whenToUse: [
      "Conversation feels forced",
      "The child engages more easily through play",
    ],
    introduction:
      "Let's play a round. Each time one of us moves a block, we'll answer a feeling question too.",
    steps: [
      "Agree on simple game rules.",
      "Take turns moving a block and asking one feeling question.",
      "Model brief, honest answers without requiring disclosure.",
      "Pause or return to ordinary play when the child needs less verbal demand.",
    ],
    therapistPrompts: [
      "What feeling showed up most this week?",
      "Where do you notice that feeling in your body?",
      "What helps that feeling get a little smaller?",
    ],
    processingQuestions: [
      "Which question was easiest to answer?",
      "What would you want someone to understand about your feelings?",
    ],
    adaptations: [
      "Use drawing, pointing, or a feelings list instead of spoken answers.",
      "Use any turn-taking block game available in the child's space.",
    ],
    cautions: [
      "Do not make answering a condition of continuing the game.",
      "Skip questions that feel too personal for the current level of trust.",
    ],
    sourceStatus: "Source not recorded",
  },
  {
    resourceId: "intervention-coping-choice-map",
    overview:
      "Organize possible coping actions by what they help with and what is available now.",
    whenToUse: [
      "The child knows coping skills but cannot choose one",
      "A familiar strategy is not helping",
    ],
    introduction:
      "Let's make a map of choices so your brain doesn't have to remember everything when things feel hard.",
    steps: [
      "Name the current feeling or need in a few words.",
      "List three to five possible coping choices.",
      "Sort choices by energy, location, or materials needed.",
      "Choose one small option to test.",
      "After testing, note whether to keep, change, or switch it.",
    ],
    therapistPrompts: [
      "Do you need more energy, less energy, or steady energy?",
      "Which choice is actually possible right now?",
    ],
    processingQuestions: [
      "What made that choice fit?",
      "What could be your backup choice?",
    ],
    adaptations: [
      "Use pictures or gestures for each choice.",
      "Limit the map to two choices when decision-making feels overwhelming.",
    ],
    cautions: ["Avoid presenting coping choices as a demand to stop feeling."],
    sourceStatus: ORIGINAL_SOURCE,
  },
  {
    resourceId: "intervention-worry-thermometer",
    overview:
      "Use a concrete scale to describe worry intensity and select proportionate support.",
    whenToUse: [
      "Worry feels vague or all-or-nothing",
      "The child benefits from visual scales",
    ],
    introduction:
      "If worry had a thermometer, where would it be right now? There isn't a wrong number.",
    steps: [
      "Draw a simple scale from 0 to 5.",
      "Let the child define what low, medium, and high worry feel like.",
      "Place the current worry on the scale.",
      "Match one support option to the current level.",
      "Check the number again after trying the support.",
    ],
    therapistPrompts: [
      "What tells you it is a 3 instead of a 1?",
      "What kind of help fits this number?",
    ],
    processingQuestions: [
      "Did the number move at all?",
      "What did you learn about this worry?",
    ],
    adaptations: [
      "Use colors, weather, or character faces instead of numbers.",
      "Let the child keep the same rating even after using a coping skill.",
    ],
    cautions: [
      "The goal is noticing and communicating, not forcing the rating downward.",
    ],
    sourceStatus: ORIGINAL_SOURCE,
  },
  {
    resourceId: "intervention-thought-detective",
    overview:
      "Practice examining a thought with curiosity instead of treating it as an automatic fact.",
    whenToUse: [
      "A sticky thought is increasing distress",
      "The child can consider more than one explanation",
    ],
    introduction:
      "Let's be detectives. We are not proving the thought wrong—we are looking for the whole set of clues.",
    steps: [
      "Write the thought exactly as it shows up.",
      "List clues that seem to support it.",
      "List clues that do not fit it or suggest another possibility.",
      "Create a balanced thought that includes both sets of clues.",
      "Choose one small way to test the balanced thought.",
    ],
    therapistPrompts: [
      "What would a camera have recorded?",
      "Is there another explanation that also fits?",
      "What would you say to a friend with this thought?",
    ],
    processingQuestions: [
      "Which clue changed the picture most?",
      "How believable does the balanced thought feel?",
    ],
    adaptations: [
      "Draw clue cards instead of writing.",
      "Use a fictional character's thought before applying the process personally.",
    ],
    cautions: [
      "Validate the feeling before examining the thought.",
      "Do not debate realistic safety concerns or lived experiences.",
    ],
    sourceStatus: ORIGINAL_SOURCE,
  },
  {
    resourceId: "intervention-calm-down-plan",
    overview:
      "Create a short sequence the child can recognize and use when regulation becomes harder.",
    whenToUse: [
      "The child wants a predictable regulation routine",
      "Too many coping options become confusing",
    ],
    introduction: "Let's build a plan with just a few steps that feel realistic for you.",
    steps: [
      "Identify one early sign that things are getting harder.",
      "Choose a first pause or communication step.",
      "Choose one body-based or sensory support.",
      "Choose one person, place, or phrase that can help.",
      "Practice the sequence once while calm.",
    ],
    therapistPrompts: [
      "What is the first clue your body gives you?",
      "What can another person do that actually helps?",
    ],
    processingQuestions: [
      "Which step feels easiest to remember?",
      "What might get in the way of using the plan?",
    ],
    adaptations: [
      "Use three pictures for a compact plan.",
      "Include movement, quiet, or sensory options based on preference.",
    ],
    cautions: [
      "Keep the plan collaborative; it should not become a compliance chart.",
      "Follow existing safety procedures when immediate risk is present.",
    ],
    sourceStatus: ORIGINAL_SOURCE,
  },
  {
    resourceId: "intervention-social-situation-replay",
    overview:
      "Slow down a social interaction, consider viewpoints, and rehearse possible next moves.",
    whenToUse: [
      "A social moment felt confusing",
      "The child wants to prepare for a similar situation",
    ],
    introduction:
      "We can replay the moment like a scene and try a few different versions without deciding that one person was the villain.",
    steps: [
      "Describe only what could be seen or heard.",
      "Name what each person might have thought, felt, or needed.",
      "Identify the moment where another choice was possible.",
      "Generate two or more possible responses.",
      "Role-play the response the child wants to practice.",
    ],
    therapistPrompts: [
      "What would a camera show?",
      "What might each person have needed?",
      "Which response sounds most like you?",
    ],
    processingQuestions: [
      "What felt different in the replay?",
      "What do you want to remember next time?",
    ],
    adaptations: [
      "Use toys, drawings, or chat bubbles to represent each person.",
      "Let the child observe while the therapist models both roles first.",
    ],
    cautions: [
      "Do not use perspective taking to excuse bullying, discrimination, or unsafe behavior.",
    ],
    sourceStatus: ORIGINAL_SOURCE,
  },
  {
    resourceId: "intervention-body-clues-check-in",
    overview:
      "Build neutral awareness of body signals and connect them with possible needs.",
    whenToUse: [
      "Feelings are hard to name",
      "The child notices distress only after it becomes intense",
    ],
    introduction:
      "Let's check what your body is communicating. You can notice without needing to change anything.",
    steps: [
      "Offer a choice to scan the whole body or one area.",
      "Notice temperature, pressure, movement, tension, or energy.",
      "Describe the clue with neutral words, colors, or shapes.",
      "Consider more than one possible feeling or need.",
      "Choose whether any support would be useful.",
    ],
    therapistPrompts: [
      "What do you notice—not what do you think you should notice?",
      "Could that clue mean more than one thing?",
    ],
    processingQuestions: [
      "Which clue was easiest to notice?",
      "What might your body be asking for?",
    ],
    adaptations: [
      "Use a body outline, emojis, or a point-and-choose list.",
      "Keep eyes open and focus on hands or feet if an internal scan is uncomfortable.",
    ],
    cautions: [
      "Stop if body focus increases distress or dissociation.",
      "Avoid interpreting a sensation for the child.",
    ],
    sourceStatus: ORIGINAL_SOURCE,
  },
  {
    resourceId: "intervention-problem-solving-steps",
    overview:
      "Turn a stuck problem into a sequence of manageable choices and one next action.",
    whenToUse: [
      "The child feels stuck or overwhelmed by a problem",
      "Impulsive solutions are creating new problems",
    ],
    introduction: "We do not have to solve everything. Let's find the next useful step.",
    steps: [
      "State the problem in one neutral sentence.",
      "Name what is and is not within the child's control.",
      "Generate at least three possible next steps, including imperfect ones.",
      "Consider likely helpful and unhelpful results of each.",
      "Choose one small step and decide when to try it.",
    ],
    therapistPrompts: [
      "What part of this can you influence?",
      "What is the smallest next step?",
      "What is your backup plan?",
    ],
    processingQuestions: [
      "Why did you choose this step?",
      "How will you know whether to continue or adjust?",
    ],
    adaptations: [
      "Use picture cards for Problem, Choices, Pick, and Try.",
      "Provide two starter options when generating choices is difficult.",
    ],
    cautions: [
      "Do not frame unsafe or coercive situations as the child's responsibility to solve.",
    ],
    sourceStatus: ORIGINAL_SOURCE,
  },
].map((record) => interventionGuidanceSchema.parse(record));

export const interventionGuidanceById = new Map(
  guidanceRecords.map((record) => [record.resourceId, record])
);

export function getInterventionById(id) {
  return interventions.find((item) => item.id === id) ?? null;
}

export function getInterventionGuidance(id) {
  return interventionGuidanceById.get(id) ?? null;
}
