import { z } from "zod";

export const blueprintSchema = z.object({
  website: z.object({
    style: z.enum([
      "modern",
      "minimal",
      "glassmorphism",
      "creative",
      "corporate",
      "terminal",
      "research",
    ]),

    developerType: z.string(),

    audience: z.string(),

    theme: z.object({
      mode: z.enum(["light", "dark"]),

      primaryColor: z.string(),

      secondaryColor: z.string(),

      accentColor: z.string(),

      headingFont: z.string(),

      bodyFont: z.string(),
    }),

    layout: z.object({
      type: z.enum([
        "single-page",
        "multi-page",
      ]),

      heroLayout: z.enum([
        "center",
        "split",
        "left",
      ]),

      maxWidth: z.string(),
    }),

    navigation: z.object({
      sticky: z.boolean(),

      showLogo: z.boolean(),

      items: z.array(z.string()),
    }),

    hero: z.object({
      headline: z.string(),

      subheading: z.string(),

      cta: z.string(),
    }),

    sections: z.array(z.object({
      id: z.string(),
      enabled: z.boolean(),
      order: z.number(),
      title: z.string(),
      variant: z.string(),
    })),

    content: z.object({
      featuredProject: z.string(),

      featuredExperience: z.string(),
    }),

    interactions: z.object({
      animations: z.boolean(),

      animationStyle: z.string(),

      smoothScroll: z.boolean(),
    }),

    seo: z.object({
      title: z.string(),

      description: z.string(),
    }),

    assets: z.object({
      showGithub: z.boolean(),

      showResumeDownload: z.boolean(),

      showLinkedIn: z.boolean(),
    }),
  }),
});

export type WebsiteBlueprint =
  z.infer<typeof WebsiteBlueprintSchema>;
