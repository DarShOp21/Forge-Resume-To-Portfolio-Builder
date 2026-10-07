import { z } from "zod";

const hexColor = z.string().regex(/^#([0-9A-Fa-f]{6})$/, "Must be a 6-digit hex color");

export const architectureSchema = z.object({
  project: z.object({
    title: z.string(),
    description: z.string(),
    websiteType: z.enum([
      "portfolio",
      "resume-site",
      "landing-page",
      "saas-marketing",
      "dashboard",
      "blog",
      "personal-brand",
      "other",
    ]),
    designStyle: z.string(),
    audience: z.string(),
    primaryGoal: z.string(),
    tone: z.string(),
  }),

  designSystem: z.object({
    colors: z.object({
      primary: hexColor,
      secondary: hexColor,
      background: hexColor,
      surface: hexColor,
      surfaceAlt: hexColor,
      text: hexColor,
      textMuted: hexColor,
      accent: hexColor,
      border: hexColor,
      success: hexColor.optional(),
      warning: hexColor.optional(),
      error: hexColor.optional(),
    }),
    typography: z.object({
      headingFont: z.string(),
      bodyFont: z.string(),
      monoFont: z.string().optional(),
      baseSizePx: z.number().min(14).max(20),
      scaleRatio: z.number().min(1.1).max(1.333),
      lineHeightBody: z.number().min(1.4).max(1.9),
      lineHeightHeading: z.number().min(1.0).max(1.3),
      fontWeightHeading: z.number().min(500).max(900),
      fontWeightBody: z.number().min(300).max(500),
    }),
    spacingScale: z.array(z.number()).min(5),
    breakpoints: z.object({
      mobile: z.number(),
      tablet: z.number(),
      desktop: z.number(),
      wide: z.number().optional(),
    }),
    borderRadius: z.object({
      sm: z.string(),
      md: z.string(),
      lg: z.string(),
      xl: z.string(),
      pill: z.string(),
    }),
    shadows: z.object({
      sm: z.string(),
      md: z.string(),
      lg: z.string(),
    }),
    layout: z.object({
      maxWidth: z.string(),
      gridColumns: z.number().min(1).max(16),
      gutter: z.string(),
      sectionGap: z.string(),
    }),
  }),

  designDirectives: z.object({
    visualHierarchy: z.string(),
    layoutRhythm: z.string(),
    alignmentStrategy: z.string(),
    density: z.enum(["compact", "balanced", "spacious"]),
    surfaceStyle: z.string(),
    borderStyle: z.string(),
    buttonStyle: z.string(),
    cardStyle: z.string(),
    motionStyle: z.string(),
    imageryStyle: z.string(),
    copyStyle: z.string(),
    antiPatterns: z.array(z.string()).min(3),
    mustHave: z.array(z.string()).default([]),
    mustAvoid: z.array(z.string()).default([]),
  }),

  seo: z.object({
    metaTitle: z.string(),
    metaDescription: z.string(),
  }).optional(),

  pages: z.array(
    z.object({
      name: z.string(),
      slug: z.string(),
      purpose: z.string(),
      sections: z.array(
        z.object({
          id: z.string(),
          tag: z.string(),
          className: z.string(),
          variant: z.string().optional(),
          purpose: z.string(),
          layout: z.string(),
          emphasis: z.enum(["high", "medium", "low"]).default("medium"),
          content: z.string(),
          items: z.array(
            z.object({
              label: z.string(),
              value: z.string().optional(),
              description: z.string().optional(),
              href: z.string().optional(),
            })
          ).optional(),
        })
      ),
    })
  ).min(1),

  components: z.array(
    z.object({
      id: z.string(),
      tag: z.string(),
      className: z.string(),
      variant: z.string().optional(),
      purpose: z.string(),
      belongsToSection: z.string().optional(),
      interactive: z.boolean().default(false),
    })
  ),

  interactions: z.array(
    z.object({
      selector: z.string(),
      event: z.string(),
      behavior: z.string(),
      target: z.string().optional(),
      progressiveEnhancement: z.boolean().default(true),
    })
  ),

  implementationNotes: z.object({
    accessibility: z.array(z.string()).default([]),
    responsiveBehavior: z.array(z.string()).default([]),
    contentPriority: z.array(z.string()).default([]),
  }),
});

export type ArchitectureSchemaType = z.infer<typeof architectureSchema>;
