import careers from "@/content/careers.json";

export type CareersArea = {
  title: string;
  body: string;
};

export type CareersContent = {
  status: {
    eyebrow: string;
    title: string;
    description: string;
  };
  areas_intro: {
    title: string;
    description: string;
  };
  areas: CareersArea[];
  footer_note: string;
};

export function getCareersContent(): CareersContent {
  return careers as CareersContent;
}
