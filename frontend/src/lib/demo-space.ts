/**
 * Placeholder content for the space canvas while the API side is being built.
 *
 * The shape mirrors what the backend already stores — a lesson, its syllabus
 * section, and topics carrying `youtube_links` — plus the canvas coordinates
 * the layout will persist later. Swap this for the real space and nothing in
 * the UI has to change.
 */

export type DemoVideo = {
  title: string;
  channel: string;
  duration: string;
  url: string;
};

export type DemoMessage = {
  from: "student" | "dock";
  text: string;
};

export type DemoTopic = {
  id: string;
  topic_name: string;
  /** Where this topic sits in the syllabus section the space covers. */
  syllabus_ref: string;
  /** Revision progress, 0–1. */
  progress: number;
  /** Canvas position, relative to the lesson at the centre. */
  x: number;
  y: number;
  videos: DemoVideo[];
  messages: DemoMessage[];
};

export type DemoSpace = {
  id: string;
  lesson_name: string;
  syllabus_section: string;
  topics: DemoTopic[];
};

const videos = (a: string, b: string, c: string): DemoVideo[] => [
  { title: a, channel: "Cognito", duration: "6:12", url: "https://www.youtube.com/results?search_query=" + encodeURIComponent(a) },
  { title: b, channel: "FuseSchool", duration: "4:38", url: "https://www.youtube.com/results?search_query=" + encodeURIComponent(b) },
  { title: c, channel: "Freesciencelessons", duration: "8:05", url: "https://www.youtube.com/results?search_query=" + encodeURIComponent(c) },
];

export const DEMO_SPACE: DemoSpace = {
  id: "6a662e20585d243afa8c49e9",
  lesson_name: "Photosynthesis",
  syllabus_section: "AQA GCSE Biology · 4.4.1",
  topics: [
    {
      id: "t1",
      topic_name: "The photosynthesis equation",
      syllabus_ref: "4.4.1.1",
      progress: 1,
      x: -370,
      y: -215,
      videos: videos(
        "The photosynthesis equation explained",
        "Word and symbol equations",
        "Reactants and products",
      ),
      messages: [
        { from: "student", text: "Do I need the symbol equation or just the words?" },
        {
          from: "dock",
          text: "Both. The spec asks you to recall the word equation and to use the symbol equation, so learn 6CO₂ + 6H₂O → C₆H₁₂O₆ + 6O₂ and be able to say it in words.",
        },
      ],
    },
    {
      id: "t2",
      topic_name: "Light-dependent reactions",
      syllabus_ref: "4.4.1.1",
      progress: 0.6,
      x: 0,
      y: -270,
      videos: videos(
        "Light-dependent reactions walkthrough",
        "Where the light reactions happen",
        "Splitting water: photolysis",
      ),
      messages: [
        { from: "student", text: "What actually happens to the water?" },
        {
          from: "dock",
          text: "Light energy splits it — photolysis. That releases the oxygen the plant gives off, and the hydrogen goes on to help make glucose.",
        },
      ],
    },
    {
      id: "t3",
      topic_name: "Chloroplasts and chlorophyll",
      syllabus_ref: "4.4.1.1",
      progress: 0.35,
      x: 370,
      y: -215,
      videos: videos(
        "Inside a chloroplast",
        "Why leaves are green",
        "Leaf structure and adaptations",
      ),
      messages: [
        { from: "student", text: "Why are leaves green if chlorophyll absorbs light?" },
        {
          from: "dock",
          text: "It absorbs red and blue light and reflects green — so the light you see coming back off the leaf is the part it did not use.",
        },
      ],
    },
    {
      id: "t4",
      topic_name: "Limiting factors",
      syllabus_ref: "4.4.1.2",
      progress: 0.2,
      x: -370,
      y: 215,
      videos: videos(
        "Limiting factors in photosynthesis",
        "Reading rate graphs",
        "Temperature, light and CO₂",
      ),
      messages: [
        { from: "student", text: "How do I tell which factor is limiting from a graph?" },
        {
          from: "dock",
          text: "Look at where the line flattens. While it is still rising, the factor on the x-axis is limiting; once it plateaus something else has taken over.",
        },
      ],
    },
    {
      id: "t5",
      topic_name: "Uses of glucose",
      syllabus_ref: "4.4.1.3",
      progress: 0,
      x: 0,
      y: 270,
      videos: videos(
        "What plants do with glucose",
        "Storage as starch",
        "Glucose, cellulose and proteins",
      ),
      messages: [
        { from: "student", text: "Is starch the only thing glucose turns into?" },
        {
          from: "dock",
          text: "No — it is used for respiration, converted to starch for storage, made into cellulose for cell walls, and combined with nitrate ions to make amino acids.",
        },
      ],
    },
    {
      id: "t6",
      topic_name: "Required practical: pondweed",
      syllabus_ref: "4.4.1.2",
      progress: 0.45,
      x: 370,
      y: 215,
      videos: videos(
        "Required practical: light intensity",
        "Counting bubbles reliably",
        "The inverse square law in the practical",
      ),
      messages: [
        { from: "student", text: "What is the control variable in this one?" },
        {
          from: "dock",
          text: "Temperature — keep the beaker in a water bath. The lamp warms the water otherwise, and you would be changing two things at once.",
        },
      ],
    },
  ],
};
