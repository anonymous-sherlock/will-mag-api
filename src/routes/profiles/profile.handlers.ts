import * as HttpStatusCodes from 'stoker/http-status-codes';

import type { AppRouteHandler } from '@/types/types';

import { db } from '@/db';
import { sendErrorResponse } from '@/helpers/send-error-response';
import { calculatePaginationMetadata } from '@/lib/queries/query.helper';
import { utapi } from '@/lib/uploadthing';

import type {
  CreateRoute,
  GetByUserIdRoute,
  GetByUsernameRoute,
  GetOneRoute,
  ListRoute,
  PatchRoute,
  RemoveProfileImageRoute,
  RemoveRoute,
  UploadBannerImageRoute,
  UploadCoverImageRoute,
  UploadProfilePhotosRoute,
} from './profile.routes';

export const list: AppRouteHandler<ListRoute> = async c => {
  const { page, limit } = c.req.valid('query');

  const [profiles, total] = await Promise.all([
    db.profile.findMany({
      skip: (page - 1) * limit,
      take: limit,
      include: {
        coverImage: {
          select: {
            id: true,
            key: true,
            caption: true,
            url: true,
          },
        },
        bannerImage: {
          select: {
            id: true,
            key: true,
            caption: true,
            url: true,
          },
        },
        user: {
          select: {
            name: true,
            displayUsername: true,
            username: true,
            image: true,
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    }),
    db.profile.count(),
  ]);

  const pagination = calculatePaginationMetadata(total, page, limit);

  return c.json(
    {
      data: profiles,
      pagination,
    },
    HttpStatusCodes.OK
  );
};

export const create: AppRouteHandler<CreateRoute> = async c => {
  const profile = c.req.valid('json');
  const insertedProfile = await db.profile.upsert({
    where: { userId: profile.userId },
    update: {
      ...profile,
    },
    create: {
      ...profile,
    },
  });
  return c.json(insertedProfile, HttpStatusCodes.CREATED);
};

export const getOne: AppRouteHandler<GetOneRoute> = async c => {
  const { id } = c.req.valid('param');
  const profile = await db.profile.findUnique({
    where: { id },
    include: {
      coverImage: {
        select: {
          id: true,
          key: true,
          caption: true,
          url: true,
        },
      },
      bannerImage: {
        select: {
          id: true,
          key: true,
          caption: true,
          url: true,
        },
      },
      profilePhotos: {
        select: {
          id: true,
          key: true,
          caption: true,
          url: true,
        },
      },
    },
  });

  if (!profile) return sendErrorResponse(c, 'notFound', 'Profile not found');

  return c.json(profile, HttpStatusCodes.OK);
};

export const getByUserId: AppRouteHandler<GetByUserIdRoute> = async c => {
  const { userId } = c.req.valid('param');
  const profile = await db.profile.findUnique({
    where: { userId },
    include: {
      coverImage: {
        select: {
          id: true,
          key: true,
          caption: true,
          url: true,
        },
      },
      bannerImage: {
        select: {
          id: true,
          key: true,
          caption: true,
          url: true,
        },
      },
      profilePhotos: {
        select: {
          id: true,
          key: true,
          caption: true,
          url: true,
        },
      },
    },
  });

  if (!profile) return sendErrorResponse(c, 'notFound', 'Profile not found');

  return c.json(profile, HttpStatusCodes.OK);
};

export const getByUsername: AppRouteHandler<GetByUsernameRoute> = async c => {
  const { username } = c.req.valid('param');

  // First find the user by username
  const user = await db.user.findUnique({
    where: { username },
    select: {
      profile: {
        include: {
          coverImage: {
            select: {
              id: true,
              key: true,
              caption: true,
              url: true,
            },
          },
          bannerImage: {
            select: {
              id: true,
              key: true,
              caption: true,
              url: true,
            },
          },
          profilePhotos: {
            select: {
              id: true,
              key: true,
              caption: true,
              url: true,
            },
          },
        },
      },
    },
  });

  if (!user || !user.profile) {
    return sendErrorResponse(c, 'notFound', 'Profile not found');
  }

  // Return the profile with included cover image and profile photos
  return c.json(user.profile, HttpStatusCodes.OK);
};

export const patch: AppRouteHandler<PatchRoute> = async c => {
  const { id } = c.req.valid('param');
  const profileData = c.req.valid('json');

  const profile = await db.profile.findUnique({
    where: { id },
  });

  if (!profile) return sendErrorResponse(c, 'notFound', 'Profile not found');

  const updatedProfile = await db.profile.update({
    where: { id },
    data: profileData,
  });

  return c.json(updatedProfile, HttpStatusCodes.OK);
};

export const remove: AppRouteHandler<RemoveRoute> = async c => {
  const { id } = c.req.valid('param');

  const profile = await db.profile.findUnique({
    where: { id },
  });

  if (!profile) return sendErrorResponse(c, 'notFound', 'Profile not found');

  await db.profile.delete({
    where: { id },
  });

  return c.json({ message: 'Profile deleted successfully' }, HttpStatusCodes.OK);
};

export const uploadCoverImage: AppRouteHandler<UploadCoverImageRoute> = async c => {
  const { id } = c.req.valid('param');
  const { file } = c.req.valid('form');

  if (!file) {
    return sendErrorResponse(c, 'badRequest', 'No file uploaded');
  }

  // Check if profile exists
  const profile = await db.profile.findUnique({
    where: { id },
    include: { coverImage: true },
  });

  if (!profile) {
    return sendErrorResponse(c, 'notFound', 'Profile not found');
  }

  // Store reference to old cover image for deletion
  const oldCoverImage = profile.coverImage;

  // Upload file using utapi
  const uploaded = await utapi.uploadFiles([file], {
    concurrency: 6,
    acl: 'public-read',
    contentDisposition: 'inline',
  });

  if (!uploaded || !uploaded[0]) {
    return sendErrorResponse(c, 'badRequest', 'Upload failed');
  }

  const files = uploaded[0].data;
  if (!files) {
    return sendErrorResponse(c, 'badRequest', 'Upload failed');
  }

  // Create media record
  const media = await db.media.create({
    data: {
      key: files.key,
      url: files.ufsUrl,
      size: files.size,
      name: files.name,
      status: 'COMPLETED',
      mediaType: 'PROFILE_COVER_IMAGE',
      type: file.type || 'image/jpeg',
    },
  });

  // Update profile with new cover image
  const updatedProfile = await db.profile.update({
    where: { id },
    data: {
      coverImageId: media.id,
    },
    include: {
      coverImage: true,
    },
  });
  await db.user.update({
    where: {
      id: updatedProfile.userId,
    },
    data: {
      image: media.url,
    },
  });

  // Delete old cover image if it exists
  if (oldCoverImage) {
    try {
      // Delete from file storage
      await utapi.deleteFiles([oldCoverImage.key]);

      // Delete from database
      await db.media.delete({
        where: { id: oldCoverImage.id },
      });
    } catch (error) {
      console.error('Error deleting old cover image:', error);
      // Don't fail the request if deletion fails, just log it
    }
  }

  return c.json(updatedProfile, HttpStatusCodes.OK);
};

export const uploadBannerImage: AppRouteHandler<UploadBannerImageRoute> = async c => {
  const { id } = c.req.valid('param');
  const { file } = c.req.valid('form');

  if (!file) {
    return sendErrorResponse(c, 'badRequest', 'No file uploaded');
  }

  // Check if profile exists
  const profile = await db.profile.findUnique({
    where: { id },
    include: { bannerImage: true },
  });

  if (!profile) {
    return sendErrorResponse(c, 'notFound', 'Profile not found');
  }

  // Store reference to old banner image for deletion
  const oldBannerImage = profile.bannerImage;

  // Upload file using utapi
  const uploaded = await utapi.uploadFiles([file], {
    concurrency: 6,
    acl: 'public-read',
    contentDisposition: 'inline',
  });

  if (!uploaded || !uploaded[0]) {
    return sendErrorResponse(c, 'badRequest', 'Upload failed');
  }

  const files = uploaded[0].data;
  if (!files) {
    return sendErrorResponse(c, 'badRequest', 'Upload failed');
  }

  // Create media record
  const media = await db.media.create({
    data: {
      key: files.key,
      url: files.ufsUrl,
      size: files.size,
      name: files.name,
      status: 'COMPLETED',
      mediaType: 'PROFILE_BANNER_IMAGE',
      type: file.type || 'image/jpeg',
    },
  });

  // Update profile with new banner image
  const updatedProfile = await db.profile.update({
    where: { id },
    data: {
      bannerImageId: media.id,
    },
    include: {
      bannerImage: true,
    },
  });

  // Delete old banner image if it exists
  if (oldBannerImage) {
    try {
      // Delete from file storage
      await utapi.deleteFiles([oldBannerImage.key]);

      // Delete from database
      await db.media.delete({
        where: { id: oldBannerImage.id },
      });
    } catch (error) {
      console.error('Error deleting old banner image:', error);
      // Don't fail the request if deletion fails, just log it
    }
  }

  return c.json(updatedProfile, HttpStatusCodes.OK);
};

export const uploadProfilePhotos: AppRouteHandler<UploadProfilePhotosRoute> = async c => {
  const { id } = c.req.valid('param');
  const { files } = c.req.valid('form');

  const fileArray = Array.isArray(files) ? files : [files];

  if (!fileArray || fileArray.length === 0) {
    return sendErrorResponse(c, 'badRequest', 'No files uploaded');
  }

  // Check if profile exists
  const profile = await db.profile.findUnique({
    where: { id },
    include: { profilePhotos: true },
  });

  if (!profile) {
    return sendErrorResponse(c, 'notFound', 'Profile not found');
  }

  // Upload files using utapi
  const uploaded = await utapi.uploadFiles(fileArray, {
    concurrency: 6,
    acl: 'public-read',
    contentDisposition: 'inline',
  });

  if (!uploaded || uploaded.length === 0) {
    return sendErrorResponse(c, 'badRequest', 'Upload failed');
  }

  // Create media records for successfully uploaded files
  const mediaRecords = [];
  for (const upload of uploaded) {
    if (upload.data) {
      const media = await db.media.create({
        data: {
          key: upload.data.key,
          url: upload.data.ufsUrl,
          size: upload.data.size,
          name: upload.data.name,
          status: 'COMPLETED',
          mediaType: 'PROFILE_IMAGE',
          type: upload.data.type || 'image/jpeg',
          profileId: profile.id,
        },
      });
      mediaRecords.push(media);
    }
  }

  if (mediaRecords.length === 0) {
    return sendErrorResponse(c, 'badRequest', 'No files were successfully uploaded');
  }

  // Get updated profile with all photos
  const updatedProfile = await db.profile.findUnique({
    where: { id },
    include: {
      profilePhotos: true,
      coverImage: true,
    },
  });

  if (!updatedProfile) {
    return sendErrorResponse(c, 'notFound', 'Profile not found after update');
  }

  return c.json(updatedProfile, HttpStatusCodes.OK);
};

export const removeProfileImage: AppRouteHandler<RemoveProfileImageRoute> = async c => {
  const { id, imageId } = c.req.valid('param');

  // Check if profile exists
  const profile = await db.profile.findUnique({
    where: { id },
    include: { profilePhotos: true },
  });

  if (!profile) {
    return sendErrorResponse(c, 'notFound', 'Profile not found');
  }

  // Check if image exists and belongs to this profile
  const image = await db.media.findFirst({
    where: {
      id: imageId,
      profileId: id,
    },
  });

  if (!image) {
    return sendErrorResponse(c, 'notFound', 'Image not found or does not belong to this profile');
  }

  try {
    // Delete from file storage
    await utapi.deleteFiles([image.key]);

    // Delete from database
    await db.media.delete({
      where: { id: imageId },
    });

    return c.json({ message: 'Image removed successfully' }, HttpStatusCodes.OK);
  } catch (error) {
    console.error('Error removing profile image:', error);
    return sendErrorResponse(c, 'badRequest', 'Failed to remove image');
  }
};
