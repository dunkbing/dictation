export type VideoTag = { value: string; label: string };

export const TOPIC_TAGS: readonly VideoTag[] = [
  { value: "movie-short-clip", label: "Movie short clip" },
  { value: "daily-english-conversation", label: "Daily English Conversation" },
  { value: "learning-resources", label: "Learning resources" },
  { value: "listening-time-shadowing", label: "Listening Time (Shadowing)" },
  { value: "ielts-listening", label: "IELTS Listening" },
  { value: "kids", label: "Kids" },
  { value: "us-uk-songs", label: "US UK songs" },
  { value: "toeic-listening", label: "TOEIC Listening" },
  { value: "entertainment", label: "Entertainment" },
  { value: "voa-learning-english", label: "VOA Learning English" },
  { value: "bbc-learning-english", label: "BBC learning english" },
  { value: "toefl-listening", label: "Toefl Listening" },
  { value: "science-and-facts", label: "Science and Facts" },
  { value: "fairy-tales", label: "Fairy Tales" },
  { value: "ipa", label: "IPA" },
  { value: "news", label: "News" },
  { value: "vietnam-today", label: "Vietnam Today" },
  { value: "ted", label: "TED" },
  { value: "travel-vlog", label: "Travel vlog" },
  { value: "animals-and-wildlife", label: "Animals and wildlife" },
  { value: "business-english", label: "Business English" },
];

export const LEVEL_TAGS: readonly VideoTag[] = [
  { value: "a1-beginner", label: "A1 Beginner" },
  { value: "a2-elementary", label: "A2 Elementary" },
  { value: "b1-intermediate", label: "B1 Intermediate" },
  { value: "b2-upper-intermediate", label: "B2 Upper-Intermediate" },
  { value: "c1-advanced", label: "C1 Advanced" },
  { value: "c2-proficient", label: "C2 Proficient" },
];

export const VIDEO_TAGS: readonly VideoTag[] = [...TOPIC_TAGS, ...LEVEL_TAGS];
