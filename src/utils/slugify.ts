// utils/slug.ts
export function generateSlug(str: string) {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export async function generateUniqueSlug(base: string, findExisting: (slug: string) => Promise<boolean>) {
  const desiredSlug = generateSlug(base);
  let uniqueSlug = desiredSlug;
  let suffix = 1;

  while (await findExisting(uniqueSlug)) {
    suffix += 1;
    uniqueSlug = `${desiredSlug}-${suffix}`;
  }

  return uniqueSlug;
}
