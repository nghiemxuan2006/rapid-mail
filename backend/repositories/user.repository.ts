import User, { UserDocument } from '../models/user.model';

export const findUserById = (id: string): Promise<UserDocument | null> => User.findById(id);

export const findUserByEmail = (email: string): Promise<UserDocument | null> =>
  User.findOne({ email });

export const findUserByConnectedAccountEmail = (email: string): Promise<UserDocument | null> =>
  User.findOne({
    connectedAccounts: { $elemMatch: { provider: 'gmail', email } },
  });

export const upsertUserByEmail = (
  email: string,
  update: { name: string; email: string },
): Promise<UserDocument | null> =>
  User.findOneAndUpdate({ email }, update, {
    new: true,
    upsert: true,
    setDefaultsOnInsert: true,
  });

export const updateUserById = (
  id: string,
  update: Record<string, unknown>,
): Promise<UserDocument | null> =>
  User.findByIdAndUpdate(id, update, { new: true }).select('name email role isActive createdAt');

export const updateUserConnectedAccountToken = (
  userId: string,
  accountId: unknown,
  accessToken: string,
): Promise<UserDocument | null> =>
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
): Promise<UserDocument | null> =>
  User.findByIdAndUpdate(userId, { $push: { connectedAccounts: account } });

export const updateConnectedAccountTokens = (
  userId: string,
  email: string,
  provider: string,
  accessToken: string,
  refreshToken: string,
): Promise<UserDocument | null> =>
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

export const setActiveAccountId = (userId: string, accountId: string): Promise<UserDocument | null> =>
  User.findByIdAndUpdate(userId, { $set: { activeAccountId: accountId } });

export const saveUser = (user: UserDocument): Promise<UserDocument> => user.save();

export const findAllUsers = (search?: string): Promise<UserDocument[]> => {
  const filter = search
    ? {
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } },
        ],
      }
    : {};

  return User.find(filter).select('name email role isActive createdAt').sort({ createdAt: -1 });
};

export const deleteUserById = (id: string): Promise<UserDocument | null> =>
  User.findByIdAndDelete(id);
