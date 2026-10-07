import { z } from "zod";

export const ResumeSchema = z.object({
  personal: z.object({
    name: z.string().default(""),
    email: z.string().default(""),
    phone: z.string().default(""),
    location: z.string().default(""),
    title: z.string().default(""),
  }),

  summary: z.string().default(""),

  skills: z.array(z.string()).default([]),

  education: z.array(
    z.object({
      institution: z.string().default(""),
      degree: z.string().default(""),
      field: z.string().default(""),
      startYear: z.string().default(""),
      endYear: z.string().default(""),
      grade: z.string().nullable(),
    })
  ).default([]),

  experience: z.array(
    z.object({
      company: z.string().default(""),
      position: z.string().default(""),
      startDate: z.string().default(""),
      endDate: z.string().default(""),
      description: z.array(z.string()).default([]),
    })
  ).default([]),

  projects: z.array(
    z.object({
      name: z.string().default(""),
      description: z.string().default(""),
      technologies: z.array(z.string()).default([]),
      link: z.string().nullable(),
    })
  ).default([]),

  certifications: z.array(
    z.object({
      name: z.string().default(""),
      issuer: z.string().default(""),
      year: z.string().nullable(),
    })
  ).default([]),

  links: z.object({
    github: z.string().nullable().default(null),
    linkedin: z.string().nullable().default(null),
    portfolio: z.string().nullable().default(null),
    website: z.string().nullable().default(null),
  }),
});

export type Resume = z.infer<typeof ResumeSchema>;
