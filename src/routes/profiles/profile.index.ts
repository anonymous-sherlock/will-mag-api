import { createRouteBuilder } from "../procedure.route";
import * as handlers from "./profile.handlers";
import * as routes from "./profile.routes";

const profileRouter = createRouteBuilder()
  .openapi(routes.list, handlers.list, "public")
  .openapi(routes.create, handlers.create, "private")
  .openapi(routes.getOne, handlers.getOne, "private")
  .openapi(routes.getByUserId, handlers.getByUserId, "private")
  .openapi(routes.getByUsername, handlers.getByUsername, "public")
  .openapi(routes.patch, handlers.patch, "private")
  .openapi(routes.remove, handlers.remove, "private")
  .openapi(routes.uploadCoverImage, handlers.uploadCoverImage, "private")
  .openapi(routes.uploadBannerImage, handlers.uploadBannerImage, "private")
  .openapi(routes.uploadProfilePhotos, handlers.uploadProfilePhotos, "private")
  .openapi(routes.removeProfileImage, handlers.removeProfileImage, "private");

export default profileRouter.getRouter();
