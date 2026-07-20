export type UserProfile = {
  id: string;
  walletAddress: string;
  displayName: string | null;
  bio: string | null;
  avatarKey: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ApiSuccess<T> = { data: T };
export type ApiError = { error: { code: string; message: string } };

export const isEthereumAddress = (value: string): boolean =>
  /^0x[a-fA-F0-9]{40}$/.test(value);

export const normalizeWalletAddress = (value: string): string =>
  value.toLowerCase();
