import z from "zod";

export const ContestSchema = z.object({
  id: z.string().cuid(),
  name: z.string({ message: "contest name is required" }).min(3).openapi({
    example: "Big Weekend",
  }),
  description: z.string(),

  createdAt: z.date().default(() => new Date()),
  updatedAt: z.date().default(() => new Date()),
  startDate: z.date().default(() => new Date()),
  prizePool: z.number(),
  endDate: z.date().default(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow;
  }),

});

export const ContestInsertSchema = ContestSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const ContestSelectSchema = ContestSchema;
