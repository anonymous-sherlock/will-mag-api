import { createRoute, z } from "@hono/zod-openapi";
import * as HttpStatusCodes from "stoker/http-status-codes";
import { jsonContent, jsonContentRequired } from "stoker/openapi/helpers";
import { createErrorSchema } from "stoker/openapi/schemas";

import { MediaSelectSchema } from "@/db/schema/media.schema";
import { ProfileInsertSchema, ProfileSelectSchema } from "@/db/schema/profile.schema";
import { BadRequestResponse, NotFoundResponse, UnauthorizedResponse } from "@/lib/openapi.responses";
import { createPaginatedResponseSchema, PaginationQuerySchema } from "@/lib/queries/query.schema";

const tags = ["Profile"];

export const list = createRoute({
  path: "/profile",
  method: "get",
  tags,
  summary: "Profile Lists",
  description: "Get a list of all profiles",
  request: {
    query: PaginationQuerySchema,
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      createPaginatedResponseSchema(ProfileSelectSchema),
      "The profile lists",
    ),
    [HttpStatusCodes.UNAUTHORIZED]: UnauthorizedResponse(),
  },
});

export const create = createRoute({
  path: "/profile",
  method: "post",
  summary: "Profile Create",
  request: {
    body: jsonContentRequired(
      ProfileInsertSchema,
      "The Profile to create",
    ),
  },
  tags,
  responses: {
    [HttpStatusCodes.CREATED]: jsonContent(
      ProfileSelectSchema,
      "The created profile",
    ),
    [HttpStatusCodes.UNAUTHORIZED]: UnauthorizedResponse(),
    [HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(
      createErrorSchema(ProfileInsertSchema),
      "The validation error(s)",
    ),
  },
});

export const getOne = createRoute({
  path: "/profile/{id}",
  method: "get",
  tags,
  summary: "Get Profile",
  description: "Get a specific profile by ID",
  request: {
    params: z.object({
      id: z.string().describe("The profile ID"),
    }),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      ProfileSelectSchema,
      "The profile",
    ),
    [HttpStatusCodes.NOT_FOUND]: NotFoundResponse("Profile not found"),
  },
});

export const getByUserId = createRoute({
  path: "/profile/user/{userId}",
  method: "get",
  tags,
  summary: "Get Profile by User ID",
  description: "Get a specific profile by user ID",
  request: {
    params: z.object({
      userId: z.string().describe("The user ID"),
    }),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      ProfileSelectSchema,
      "The profile",
    ),
    [HttpStatusCodes.NOT_FOUND]: NotFoundResponse("Profile not found"),
  },
});

export const getByUsername = createRoute({
  path: "/profile/username/{username}",
  method: "get",
  tags,
  summary: "Get Profile by Username",
  description: "Get a specific profile by username with cover image and profile photos",
  request: {
    params: z.object({
      username: z.string().describe("The username"),
    }),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      ProfileSelectSchema.extend({
        coverImage: MediaSelectSchema.pick({
          id: true,
          key: true,
          caption: true,
          url: true,
        }).nullable(),
        profilePhotos: z.array(MediaSelectSchema.pick({
          id: true,
          key: true,
          caption: true,
          url: true,
        })).nullable(),
      }),
      "The profile with cover image and profile photos",
    ),
    [HttpStatusCodes.NOT_FOUND]: NotFoundResponse("Profile not found"),
  },
});

export const patch = createRoute({
  path: "/profile/{id}",
  method: "patch",
  tags,
  summary: "Update Profile",
  description: "Update a specific profile by ID",
  request: {
    params: z.object({
      id: z.string().describe("The profile ID"),
    }),
    body: jsonContentRequired(
      ProfileInsertSchema.partial(),
      "The profile data to update",
    ),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      ProfileSelectSchema,
      "The updated profile",
    ),
    [HttpStatusCodes.NOT_FOUND]: NotFoundResponse("Profile not found"),
    [HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(
      createErrorSchema(ProfileInsertSchema.partial()),
      "The validation error(s)",
    ),
  },
});

export const remove = createRoute({
  path: "/profile/{id}",
  method: "delete",
  tags,
  summary: "Delete Profile",
  description: "Delete a specific profile by ID",
  request: {
    params: z.object({
      id: z.string().describe("The profile ID"),
    }),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      z.object({ message: z.string() }),
      "Profile deleted successfully",
    ),
    [HttpStatusCodes.NOT_FOUND]: NotFoundResponse("Profile not found"),
  },
});

export const uploadCoverImage = createRoute({
  path: "/profile/{id}/upload/cover",
  method: "post",
  tags,
  summary: "Upload Profile Cover",
  description: "Upload a cover image for a specific profile",
  request: {
    params: z.object({
      id: z.string().describe("The profile ID"),
    }),
    body: {
      content: {
        "multipart/form-data": {
          schema: z.object({
            file: z.instanceof(File).describe("The cover image file to upload"),
          }),
        },
      },
      required: true,
    },
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      ProfileSelectSchema,
      "The updated profile with cover image",
    ),
    [HttpStatusCodes.NOT_FOUND]: NotFoundResponse("Profile not found"),
    [HttpStatusCodes.BAD_REQUEST]: BadRequestResponse("Upload failed"),
  },
});

export const uploadProfilePhotos = createRoute({
  path: "/profile/{id}/upload/photos",
  method: "post",
  tags,
  summary: "Upload Profile Photos",
  description: "Upload gallery photos for a specific profile, Each file must have a key name files",
  request: {
    params: z.object({
      id: z.string().describe("The profile ID"),
    }),
    body: {
      content: {
        "multipart/form-data": {
          schema: z.object({
            files: z.array(z.instanceof(File)).describe("The profile photo files to upload"),
          }),
        },
      },
      required: true,
    },
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      ProfileSelectSchema,
      "The updated profile with new photos",
    ),
    [HttpStatusCodes.NOT_FOUND]: NotFoundResponse("Profile not found"),
    [HttpStatusCodes.BAD_REQUEST]: BadRequestResponse("Upload failed"),
  },
});

export const removeProfileImage = createRoute({
  path: "/profile/{id}/images/{imageId}",
  method: "delete",
  tags,
  summary: "Remove Profile Photos",
  description: "Remove a specific image from a profile",
  request: {
    params: z.object({
      id: z.string().describe("The profile ID"),
      imageId: z.string().describe("The image ID to remove"),
    }),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      z.object({ message: z.string() }),
      "Image removed successfully",
    ),
    [HttpStatusCodes.NOT_FOUND]: NotFoundResponse("Profile or image not found"),
    [HttpStatusCodes.BAD_REQUEST]: BadRequestResponse("Failed to remove image"),
  },
});

export type ListRoute = typeof list;
export type CreateRoute = typeof create;
export type GetOneRoute = typeof getOne;
export type GetByUserIdRoute = typeof getByUserId;
export type GetByUsernameRoute = typeof getByUsername;
export type PatchRoute = typeof patch;
export type RemoveRoute = typeof remove;
export type UploadCoverImageRoute = typeof uploadCoverImage;
export type UploadProfilePhotosRoute = typeof uploadProfilePhotos;
export type RemoveProfileImageRoute = typeof removeProfileImage;
