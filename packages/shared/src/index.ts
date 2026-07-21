export const LIMITS = {
  usernameMin: 3,
  usernameMax: 24,
  displayNameMax: 50,
  bioMax: 280,
  postBodyMax: 500,
  imageMaxBytes: 8_000_000,
  avatarMaxBytes: 5_000_000,
} as const;

export const IMAGE_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;
export type ImageMimeType = (typeof IMAGE_MIME_TYPES)[number];

export const RESERVED_USERNAMES = new Set([
  "admin",
  "api",
  "aura",
  "compose",
  "explore",
  "help",
  "home",
  "me",
  "moderator",
  "notifications",
  "post",
  "privacy",
  "profile",
  "root",
  "security",
  "settings",
  "support",
  "system",
  "terms",
  "verified",
  "white_paper",
  "wp",
]);

export type PublicUserProfile = {
  id: string;
  username: string;
  displayName: string;
  bio: string | null;
  avatarUrl: string | null;
  bannerUrl: string | null;
  location: string | null;
  websiteUrl: string | null;
  manuallyEnteredWalletAddress: string | null;
  isVerified: boolean;
  createdAt: string;
  updatedAt: string;
};

export type EditableUserProfile = PublicUserProfile;
export type PostAuthor = Pick<
  PublicUserProfile,
  "id" | "username" | "displayName" | "avatarUrl" | "isVerified"
>;

export type Post = {
  id: string;
  userId: string;
  body: string | null;
  mediaUrl: string | null;
  mediaType: ImageMimeType | null;
  repostOfPostId: string | null;
  replyToPostId: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};

export type PostSummary = Pick<
  FeedPost,
  "id" | "body" | "author" | "createdAt"
>;
export type FeedPost = Post & {
  author: PostAuthor;
  likeCount: number;
  commentCount: number;
  repostCount: number;
  currentUserLiked: boolean;
  currentUserFollowsAuthor: boolean;
  originalPost: PostSummary | null;
  parentPost: PostSummary | null;
};

export type Comment = FeedPost;
export type NotificationType =
  | "follow"
  | "like"
  | "comment"
  | "repost"
  | "mention";
export type Notification = {
  id: string;
  type: NotificationType;
  actor: PostAuthor;
  post: PostSummary | null;
  readAt: string | null;
  createdAt: string;
  groupCount: number;
};

export type PaginatedResponse<T> = { data: T[]; nextCursor: string | null };
export type CreatePostInput = {
  body?: string | null;
  replyToPostId?: string | null;
  repostOfPostId?: string | null;
};
export type UpdateProfileInput = {
  username: string;
  displayName: string;
  bio?: string | null;
  location?: string | null;
  websiteUrl?: string | null;
  manuallyEnteredWalletAddress?: string | null;
};

export type ApiSuccess<T> = { data: T };
export type ApiError = {
  error: { code: string; message: string; fields?: Record<string, string> };
};

export const isEthereumAddress = (value: string): boolean =>
  /^0x[a-fA-F0-9]{40}$/.test(value);
export const normalizeWalletAddress = (value: string): string =>
  value.toLowerCase();
export const isUsername = (value: string): boolean =>
  /^[a-z0-9_]{3,24}$/.test(value) && !RESERVED_USERNAMES.has(value);
export const isDisplayName = (value: string): boolean =>
  value.trim().length >= 1 && value.trim().length <= LIMITS.displayNameMax;
export const isBio = (value: string): boolean => value.length <= LIMITS.bioMax;
export const isWebsiteUrl = (value: string): boolean => {
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
};
export const isPostBody = (value: string): boolean =>
  value.trim().length >= 1 && value.length <= LIMITS.postBodyMax;
export const isImageMimeType = (value: string): value is ImageMimeType =>
  IMAGE_MIME_TYPES.includes(value as ImageMimeType);
export const isPaginationCursor = (value: string): boolean =>
  /^[A-Za-z0-9_-]{1,512}$/.test(value);

export function validateProfile(
  input: UpdateProfileInput,
): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!isUsername(input.username))
    errors.username =
      "Use 3–24 lowercase letters, numbers, or underscores; this name may be reserved.";
  if (!isDisplayName(input.displayName))
    errors.displayName = "Display name must contain 1–50 characters.";
  if (input.bio != null && !isBio(input.bio))
    errors.bio = "Bio must be 280 characters or fewer.";
  if (input.location != null && input.location.length > 80)
    errors.location = "Location must be 80 characters or fewer.";
  if (input.websiteUrl && !isWebsiteUrl(input.websiteUrl))
    errors.websiteUrl = "Website must be a valid HTTPS URL.";
  if (
    input.manuallyEnteredWalletAddress &&
    !isEthereumAddress(input.manuallyEnteredWalletAddress)
  )
    errors.manuallyEnteredWalletAddress =
      "Enter a valid public Ethereum address.";
  return errors;
}

export function validatePost(
  input: CreatePostInput,
  hasImage = false,
): Record<string, string> {
  const errors: Record<string, string> = {};
  const body = input.body?.trim() ?? "";
  if (body.length > LIMITS.postBodyMax)
    errors.body = "Posts are limited to 500 characters.";
  if (!body && !hasImage && !input.repostOfPostId)
    errors.body = "Write something or add an image.";
  if (input.replyToPostId && input.repostOfPostId)
    errors.context = "A post cannot be both a reply and a repost.";
  return errors;
}

export const canFollow = (actorId: string, targetId: string): boolean =>
  Boolean(actorId && targetId && actorId !== targetId);
export const applyIdempotentLike = (
  likedUsers: ReadonlySet<string>,
  userId: string,
): Set<string> => new Set([...likedUsers, userId]);

export function parseMentions(body: string): string[] {
  const matches = body.matchAll(/(^|[^a-zA-Z0-9_])@([a-z0-9_]{3,24})\b/g);
  return [
    ...new Set(
      [...matches]
        .map((match) => match[2]!)
        .filter((name) => !RESERVED_USERNAMES.has(name)),
    ),
  ];
}

export type FeedRowLike = Omit<
  FeedPost,
  "currentUserLiked" | "currentUserFollowsAuthor"
> & {
  currentUserLiked: number | boolean;
  currentUserFollowsAuthor: number | boolean;
};
export const mapFeedPost = (row: FeedRowLike): FeedPost => ({
  ...row,
  currentUserLiked: Boolean(row.currentUserLiked),
  currentUserFollowsAuthor: Boolean(row.currentUserFollowsAuthor),
});
export * from "./auth";
