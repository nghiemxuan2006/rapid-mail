import User, { UserDocument } from '../models/user.model';

export const findUserById = (id: string) =>
  User.findById(id);

export const findUserByEmail = (email: string) =>
  User.findOne({ email });

export const findUserByConnectedAccountEmail = (email: string) =>
  User.findOne({
    connectedAccounts: { $elemMatch: { provider: 'gmail', email } },
  });

export const upsertUserByEmail = (
  email: string,
  update: { name: string; email: string; googleAccessToken: string; googleRefreshToken: string },
): Promise<UserDocument | null> =>
  User.findOneAndUpdate({ email }, update, {
    new: true,
    upsert: true,
    setDefaultsOnInsert: true,
  });

export const updateUserById = (id: string, update: Record<string, unknown>) =>
  User.findByIdAndUpdate(id, update, { new: true });

export const updateUserConnectedAccountToken = (
  userId: string,
  accountId: unknown,
  accessToken: string,
) =>
  User.findOneAndUpdate(
    { _id: userId, 'connectedAccounts._id': accountId },
    { $set: { 'connectedAccounts.$.accessToken': accessToken } },
  );

export const pushConnectedAccount = (
  userId: string,
  account: {
    email: string;
    provider: string;
    accessToken: string;
    refreshToken: string;
  },
) =>
  User.findByIdAndUpdate(userId, { $push: { connectedAccounts: account } });

export const updateConnectedAccountTokens = (
  userId: string,
  email: string,
  provider: string,
  accessToken: string,
  refreshToken: string,
) =>
  User.findByIdAndUpdate(
    userId,
    {
      $set: {
        'connectedAccounts.$[elem].accessToken': accessToken,
        'connectedAccounts.$[elem].refreshToken': refreshToken,
      },
    },
    { arrayFilters: [{ 'elem.email': email, 'elem.provider': provider }] },
  );

export const setActiveAccountId = (userId: string, accountId: string) =>
  User.findByIdAndUpdate(userId, { $set: { activeAccountId: accountId } });

export const saveUser = (user: UserDocument) => user.save();
