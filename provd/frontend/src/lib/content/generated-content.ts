import generated from "./generated-content.json";

export type GeneratedContentRecord = {
  type: "docs" | "blog";
  url: string;
  slug: string;
  title: string;
  description: string;
  date: string;
  tags: string[];
  content: string;
};

type GeneratedContentFile = {
  generatedAt: string;
  records: GeneratedContentRecord[];
};

const contentFile = generated as GeneratedContentFile;

export function getGeneratedContentRecord(type: "docs" | "blog", slug: string) {
  return contentFile.records.find((record) => record.type === type && record.slug === slug);
}

export function getGeneratedDocsRecords() {
  return contentFile.records.filter((record) => record.type === "docs");
}

export function getGeneratedBlogRecords() {
  return contentFile.records.filter((record) => record.type === "blog");
}
